'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, DollarSign, Mail, Phone, Gift, Cake, Sparkles, CheckCircle2, XCircle, AlertCircle, Ban, Undo2, Edit, Save, X, CreditCard, Wallet, Landmark, Send, FolderPlus } from 'lucide-react'
import {
  formatDateTime,
  formatCurrency,
  getClientDisplayName,
  getClientInitials,
  formatDuration,
  durationToMinutes,
  minutesToDurationAmount,
  type DurationUnit,
} from '@/lib/utils'
import {
  updateAppointmentStatus,
  rescheduleAppointment,
  updateAppointment,
  updateAppointmentServiceDurations,
} from '@/app/actions/appointments'
import { getClient } from '@/app/actions/clients'
import { createProjectFromAppointmentService } from '@/app/actions/projects'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ClientModal } from '@/components/client-modal'
import { PaymentDialog } from '@/components/payment-dialog'
import { RefundDialog } from '@/components/refund-dialog'
import { MessageSquare, Copy, ExternalLink, Paperclip } from 'lucide-react'
import { dispatchSyncEvent, onSyncEvent } from '@/lib/sync-events'
import {
  grossPaymentsTotal,
  invoiceBalanceDue,
  netPaymentsTotal,
  refundsTotal,
} from '@/lib/payment-net'

const DURATION_UNIT_OPTIONS: { value: DurationUnit; label: string }[] = [
  { value: 'MINUTES', label: 'Minutes' },
  { value: 'HOURS', label: 'Hours' },
  { value: 'DAYS', label: 'Days' },
  { value: 'MONTHS', label: 'Months' },
  { value: 'YEARS', label: 'Years' },
]

const MAX_STORED_LINE_MINUTES = 10 * 365 * 24 * 60

function coerceDurationUnit(u: string | null | undefined): DurationUnit {
  const up = String(u || 'MINUTES').toUpperCase() as DurationUnit
  return DURATION_UNIT_OPTIONS.some((o) => o.value === up) ? up : 'MINUTES'
}

interface AppointmentDialogProps {
  appointment: any
  services: any[]
  clients: any[]
  staff: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppointmentDialog({
  appointment,
  services,
  clients,
  staff,
  open,
  onOpenChange,
}: AppointmentDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [newStartAt, setNewStartAt] = useState('')
  const [newEndAt, setNewEndAt] = useState('')
  const [previousStatus, setPreviousStatus] = useState<string | null>(null)
  const [showUndo, setShowUndo] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(appointment?.status || null)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [loadingClient, setLoadingClient] = useState(false)
  
  // Edit form state
  const [editClientId, setEditClientId] = useState('')
  const [editStaffId, setEditStaffId] = useState('')
  const [editStartAt, setEditStartAt] = useState('')
  const [editEndAt, setEditEndAt] = useState('')
  const [editServiceIds, setEditServiceIds] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [currentAppointment, setCurrentAppointment] = useState(appointment)
  const [whatsappMessage, setWhatsappMessage] = useState<{ message: string; phoneNumber: string | null; whatsappUrl: string } | null>(null)
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false)
  const [addingToPipeline, setAddingToPipeline] = useState<string | null>(null)
  const [durationAmountDrafts, setDurationAmountDrafts] = useState<Record<string, string>>({})
  const [durationUnitDrafts, setDurationUnitDrafts] = useState<Record<string, DurationUnit>>({})
  const [isSavingDurations, setIsSavingDurations] = useState(false)

  const durationSyncKey = useMemo(() => {
    if (!currentAppointment?.appointmentServices?.length) return ''
    return currentAppointment.appointmentServices
      .map((as: any) => `${as.id}:${as.durationAtTime}`)
      .join('|')
  }, [currentAppointment?.appointmentServices])

  useEffect(() => {
    if (!open || !currentAppointment?.appointmentServices?.length) return
    const nextA: Record<string, string> = {}
    const nextU: Record<string, DurationUnit> = {}
    for (const as of currentAppointment.appointmentServices) {
      const unit = coerceDurationUnit(as.service?.durationUnit)
      const totalMin = Number(as.durationAtTime ?? 0)
      const amt = minutesToDurationAmount(totalMin, unit)
      nextU[as.id] = unit
      nextA[as.id] =
        unit === 'MINUTES' ? String(Math.round(amt)) : String(amt % 1 === 0 ? amt : Math.round(amt * 100) / 100)
    }
    setDurationAmountDrafts(nextA)
    setDurationUnitDrafts(nextU)
  }, [open, currentAppointment?.id, durationSyncKey])

  const canEditDurations =
    currentAppointment &&
    !['CANCELLED', 'NO_SHOW'].includes(currentAppointment.status)

  const handleSaveDurations = async () => {
    if (!currentAppointment?.appointmentServices?.length || !canEditDurations) return
    const services: { appointmentServiceId: string; durationMinutes: number }[] = []
    for (const as of currentAppointment.appointmentServices) {
      const unit = durationUnitDrafts[as.id] ?? coerceDurationUnit(as.service?.durationUnit)
      const raw = String(durationAmountDrafts[as.id] ?? '').trim()
      const amount = parseFloat(raw)
      if (!Number.isFinite(amount) || amount <= 0) {
        toast({
          title: 'Invalid duration',
          description: 'Enter a positive number for each service (e.g. 2 months or 90 minutes).',
          variant: 'destructive',
        })
        return
      }
      const n = durationToMinutes(amount, unit)
      if (!Number.isFinite(n) || n < 1) {
        toast({
          title: 'Invalid duration',
          description: 'That duration is too small. Use a larger amount or a smaller unit.',
          variant: 'destructive',
        })
        return
      }
      if (n > MAX_STORED_LINE_MINUTES) {
        toast({
          title: 'Invalid duration',
          description: 'That duration is too large (max 10 years per line).',
          variant: 'destructive',
        })
        return
      }
      services.push({ appointmentServiceId: as.id, durationMinutes: n })
    }
    setIsSavingDurations(true)
    try {
      const updated = await updateAppointmentServiceDurations({
        appointmentId: currentAppointment.id,
        services,
      })
      setCurrentAppointment(updated)
      toast({
        title: 'Duration updated',
        description: 'End time was adjusted to match the new total duration.',
      })
      router.refresh()
      dispatchSyncEvent('appointment-updated', { appointmentId: currentAppointment.id })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update duration',
        variant: 'destructive',
      })
    } finally {
      setIsSavingDurations(false)
    }
  }

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditing && currentAppointment) {
      setEditClientId(currentAppointment.clientId)
      setEditStaffId(currentAppointment.staffId)
      setEditStartAt(formatForInput(currentAppointment.startAt))
      setEditEndAt(formatForInput(currentAppointment.endAt))
      setEditServiceIds(currentAppointment.appointmentServices?.map((as: any) => as.serviceId) || [])
      setEditNotes(currentAppointment.notes || '')
      setEditStatus(currentAppointment.status)
    }
  }, [isEditing, currentAppointment])

  // Update local appointment when prop changes
  useEffect(() => {
    setCurrentAppointment(appointment)
  }, [appointment])

  // Calendar/dashboard pass minimal client data (no loyalty). Refetch on open so points + sync stay correct.
  useEffect(() => {
    if (!open || !appointment?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/appointments/${appointment.id}?t=${Date.now()}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled) setCurrentAppointment(data)
      } catch {
        // keep prop snapshot
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, appointment?.id])

  // Listen for payment updates and refresh appointment data
  useEffect(() => {
    const handlePaymentRecorded = async (event: CustomEvent) => {
      // Check if this payment is for the current appointment
      if (event.detail?.appointmentId === currentAppointment?.id) {
        // Fetch fresh appointment data
        try {
          const response = await fetch(`/api/appointments/${currentAppointment.id}?t=${Date.now()}`)
          if (response.ok) {
            const updatedAppointment = await response.json()
            setCurrentAppointment(updatedAppointment)
          }
        } catch (error) {
          console.error('Failed to refresh appointment after payment:', error)
        }
      }
    }

    const cleanup = onSyncEvent('payment-recorded', handlePaymentRecorded as any)
    
    return () => {
      cleanup()
    }
  }, [currentAppointment?.id])

  // Update local status when appointment prop changes
  useEffect(() => {
    if (!currentAppointment?.status) return
    if (currentAppointment.status) {
      setCurrentStatus(currentAppointment.status)
      // If appointment is cancelled and we have a previous status, show undo
      if ((currentAppointment.status === 'CANCELLED' || currentAppointment.status === 'LATE_CANCEL' || currentAppointment.status === 'NO_SHOW') && previousStatus) {
        setShowUndo(true)
      } else if (previousStatus && currentAppointment.status !== 'CANCELLED' && currentAppointment.status !== 'LATE_CANCEL' && currentAppointment.status !== 'NO_SHOW') {
        // If status changed back from cancelled, hide undo
        setPreviousStatus(null)
        setShowUndo(false)
      }
    }
  }, [currentAppointment?.status, previousStatus])

  const handleStatusChange = async (status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'LATE_CANCEL' | 'NO_SHOW') => {
    try {
      // Store previous status if cancelling
      if (status === 'CANCELLED' || status === 'LATE_CANCEL' || status === 'NO_SHOW') {
        setPreviousStatus(currentAppointment.status)
        setShowUndo(true)
      } else {
        setPreviousStatus(null)
        setShowUndo(false)
      }

      await updateAppointmentStatus(currentAppointment.id, status)
      setCurrentStatus(status)
      
      toast({
        title: 'Success',
        description: `Appointment status updated to ${status}${status === 'CANCELLED' || status === 'LATE_CANCEL' || status === 'NO_SHOW' ? ' - Use Undo button to restore' : ''}`,
      })
      router.refresh()
      // Dispatch sync event to notify all pages
      dispatchSyncEvent('appointment-updated', { appointmentId: currentAppointment.id, status })
      // Don't close dialog immediately if cancelled - allow undo
      if (status !== 'CANCELLED' && status !== 'LATE_CANCEL' && status !== 'NO_SHOW') {
        onOpenChange(false)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update appointment status',
        variant: 'destructive',
      })
      setPreviousStatus(null)
      setShowUndo(false)
    }
  }

  const handleApproveAppointment = async () => {
    await handleStatusChange('CONFIRMED')
  }

  const handleRejectAppointment = async () => {
    await handleStatusChange('CANCELLED')
  }

  const handleSendWhatsApp = async () => {
    try {
      const response = await fetch(`/api/whatsapp?appointmentId=${currentAppointment.id}`)
      if (response.ok) {
        const message = await response.json()
        if (message) {
          setWhatsappMessage(message)
          setShowWhatsAppDialog(true)
        } else {
          toast({
            title: 'Error',
            description: 'Failed to generate WhatsApp message',
            variant: 'destructive',
          })
        }
      } else {
        throw new Error('Failed to fetch WhatsApp message')
      }
    } catch (error) {
      console.error('Failed to generate WhatsApp message:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate WhatsApp message',
        variant: 'destructive',
      })
    }
  }

  const copyWhatsAppMessage = () => {
    if (whatsappMessage) {
      navigator.clipboard.writeText(whatsappMessage.message)
      toast({
        title: 'Copied!',
        description: 'WhatsApp message copied to clipboard',
      })
    }
  }

  const handleUndo = async () => {
    if (!previousStatus) return

    try {
      await updateAppointmentStatus(currentAppointment.id, previousStatus as any)
      toast({
        title: 'Undone',
        description: `Appointment status restored to ${previousStatus}`,
      })
      setPreviousStatus(null)
      setShowUndo(false)
      router.refresh()
      // Close dialog after undo
      setTimeout(() => {
        onOpenChange(false)
      }, 500)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to undo appointment cancellation',
        variant: 'destructive',
      })
    }
  }

  const handleReschedule = async () => {
    if (!newStartAt || !newEndAt) {
      toast({
        title: 'Error',
        description: 'Please provide both start and end times',
        variant: 'destructive',
      })
      return
    }

    try {
      await rescheduleAppointment({
        id: currentAppointment.id,
        startAt: new Date(newStartAt).toISOString(),
        endAt: new Date(newEndAt).toISOString(),
      })
      toast({
        title: 'Success',
        description: 'Appointment rescheduled successfully',
      })
      router.refresh()
      setIsRescheduling(false)
      setNewStartAt('')
      setNewEndAt('')
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reschedule appointment',
        variant: 'destructive',
      })
    }
  }

  // Format datetime-local input values
  const formatForInput = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleClientClick = async (clientId: string) => {
    setLoadingClient(true)
    try {
      const client = await getClient(clientId)
      setSelectedClient(client)
      setIsClientModalOpen(true)
    } catch (error) {
      console.error('Failed to load client:', error)
      toast({
        title: 'Error',
        description: 'Failed to load client profile',
        variant: 'destructive',
      })
    } finally {
      setLoadingClient(false)
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    setEditServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  const calculateEndTime = useCallback((start: string, serviceIds: string[]) => {
    if (!start || serviceIds.length === 0) return ''
    const startDate = new Date(start)
    const totalDuration = serviceIds.reduce((sum, id) => {
      const service = services.find((s) => s.id === id)
      return sum + (service?.durationMinutes || 0)
    }, 0)
    const endDate = new Date(startDate.getTime() + totalDuration * 60000)
    return formatForInput(endDate.toISOString())
  }, [services])

  const handleSaveEdit = async () => {
    if (!editClientId || !editStaffId || editServiceIds.length === 0 || !editStartAt || !editEndAt) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    // Validate that end time is after start time
    const startDate = new Date(editStartAt)
    const endDate = new Date(editEndAt)
    if (endDate <= startDate) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const updatedAppointment = await updateAppointment({
        id: currentAppointment.id,
        clientId: editClientId,
        staffId: editStaffId,
        startAt: new Date(editStartAt).toISOString(),
        endAt: new Date(editEndAt).toISOString(),
        serviceIds: editServiceIds,
        notes: editNotes || null,
        status: editStatus as any,
      })
      
      console.log('Appointment updated:', updatedAppointment)
      
      toast({
        title: 'Success',
        description: 'Appointment updated successfully',
      })
      setIsEditing(false)
      
      // Force a hard refresh to ensure data is updated
      router.refresh()
      
      // Close dialog after a brief delay to show success message
      setTimeout(() => {
        onOpenChange(false)
        // Additional refresh after closing to ensure UI updates
        router.refresh()
      }, 500)
    } catch (error: any) {
      console.error('Failed to update appointment:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update appointment',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-calculate end time when start time or services change (optional helper)
  // User can still manually edit the end time
  useEffect(() => {
    if (isEditing && editStartAt && editServiceIds.length > 0 && !editEndAt) {
      // Only auto-calculate if end time is empty
      const endAt = calculateEndTime(editStartAt, editServiceIds)
      if (endAt) {
        setEditEndAt(endAt)
      }
    }
  }, [editStartAt, editServiceIds, isEditing, editEndAt, calculateEndTime])

  // Early return after all hooks
  if (!appointment) return null

  const client = currentAppointment.client
  const clientLoyaltyBalance = client.loyaltyAccount?.pointsBalance ?? 0
  const visitLoyaltyPoints = (currentAppointment.loyaltyTransactions ?? []).reduce(
    (sum: number, t: { deltaPoints: number }) => sum + Number(t.deltaPoints || 0),
    0
  )
  const birthday = client.birthday ? new Date(client.birthday) : null
  const isBirthdayMonth = birthday && birthday.getMonth() === new Date().getMonth()
  const isInPipeline = Boolean(
    currentAppointment?.appointmentServices?.some((as: any) => as?.pipelineProject?.id)
  )
  const showInProgress =
    isInPipeline &&
    currentAppointment?.status !== 'COMPLETED' &&
    !['CANCELLED', 'NO_SHOW', 'LATE_CANCEL'].includes(String(currentAppointment?.status))
  const statusLabel = showInProgress ? 'IN PROGRESS' : String(currentStatus || currentAppointment?.status || '')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Appointment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Client Info */}
            <div className="flex items-start gap-3 pb-3 border-b">
              <Avatar 
                className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => handleClientClick(client.id)}
                title="Click to view client profile"
              >
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getClientInitials(client)}
                </AvatarFallback>
              </Avatar>
            <div className="flex-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-base mb-1">
                  {getClientDisplayName(client)}
                </h3>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {birthday && (
                  <div className="flex items-center gap-2">
                    <Cake className={`h-3.5 w-3.5 ${isBirthdayMonth ? 'text-pink-500' : ''}`} />
                    <span>
                      Birthday: {format(birthday, 'MMM d, yyyy')}
                      {isBirthdayMonth && ' 🎉'}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    <span>
                      This visit:{' '}
                      <span className="font-semibold text-yellow-700 tabular-nums">
                        {visitLoyaltyPoints > 0 ? '+' : ''}
                        {visitLoyaltyPoints} pts
                      </span>
                    </span>
                  </div>
                  <div className="pl-[1.375rem] text-[11px] text-muted-foreground">
                    Client total balance:{' '}
                    <span className="font-medium text-foreground/80 tabular-nums">{clientLoyaltyBalance} pts</span>
                  </div>
                </div>
              </div>
              </div>
              {currentAppointment.status === 'COMPLETED' ? (
                <Badge className="shrink-0 bg-emerald-600 text-white border-0 text-xs">
                  Completed
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Start Time</p>
              <p className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDateTime(currentAppointment.startAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">End Time</p>
              <p className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDateTime(currentAppointment.endAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <Badge
                variant={
                  currentStatus === 'COMPLETED'
                    ? 'default'
                    : currentStatus === 'CANCELLED' || currentStatus === 'NO_SHOW' || currentStatus === 'LATE_CANCEL'
                      ? 'destructive'
                      : 'secondary'
                }
                className={`text-xs ${showInProgress ? 'bg-sky-600 text-white border-0' : ''}`}
              >
                {statusLabel}
              </Badge>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">Total Price</p>
                {(() => {
                  const totalPrice = Number(currentAppointment.totalPrice || 0)
                  const grossPaid = grossPaymentsTotal(currentAppointment.payments)
                  const balanceDue = invoiceBalanceDue(totalPrice, currentAppointment.payments)
                  const isPaid = balanceDue <= 0.01 && totalPrice > 0
                  const isPartial = grossPaid > 0 && balanceDue > 0.01
                  
                  if (totalPrice === 0) return null
                  
                  return (
                    <Badge 
                      variant={isPaid ? 'default' : 'secondary'}
                      className={`text-xs ${
                        isPaid 
                          ? 'bg-green-600 text-white border-0' 
                          : isPartial
                          ? 'bg-orange-100 text-orange-700 border-orange-300'
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}
                    >
                      {isPaid ? 'Paid' : isPartial ? `Paid ${formatCurrency(grossPaid)}` : 'Pending'}
                    </Badge>
                  )
                })()}
              </div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                {formatCurrency(currentAppointment.totalPrice)}
              </p>
              {(() => {
                const totalPrice = Number(currentAppointment.totalPrice || 0)
                const grossPaid = grossPaymentsTotal(currentAppointment.payments)
                const netPaid = netPaymentsTotal(currentAppointment.payments)
                const balanceDue = invoiceBalanceDue(totalPrice, currentAppointment.payments)
                const refunded = refundsTotal(currentAppointment.payments)
                
                if (totalPrice > 0 && balanceDue > 0.01) {
                  return (
                    <p className="text-xs text-orange-600 mt-0.5">
                      Balance due: {formatCurrency(balanceDue)}
                    </p>
                  )
                }
                if (totalPrice > 0 && refunded > 0.01 && grossPaid + 0.009 >= totalPrice) {
                  return (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-xs text-amber-800 font-medium">
                        Refunded: {formatCurrency(refunded)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Net retained: {formatCurrency(netPaid)}
                      </p>
                    </div>
                  )
                }
                if (totalPrice > 0 && grossPaid > 0) {
                  const paymentMethods =
                    currentAppointment.payments
                      ?.filter((p: any) => !p.isRefund)
                      .map((p: any) => p.paymentMethod)
                      .filter(Boolean) || []
                  const uniqueMethods = [...new Set(paymentMethods)]
                  if (uniqueMethods.length > 0) {
                    return (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Paid via: {uniqueMethods.join(', ')}
                      </p>
                    )
                  }
                }
                return null
              })()}
            </div>
          </div>

          {currentAppointment.appointmentServices && currentAppointment.appointmentServices.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5" />
                Services
              </p>
              <p className="text-[11px] text-muted-foreground mb-2">
                Enter duration in minutes, hours, days, or months—same as when you set up the service. The calendar
                still uses a short time block per line; the full length is kept here for your records.
              </p>
              <div className="space-y-2">
                {currentAppointment.appointmentServices.map((as: any) => (
                  <div
                    key={as.id}
                    className="rounded-lg border border-border/70 bg-muted/40 p-3 text-sm shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <div className="flex items-start justify-between gap-3 gap-y-1">
                          <span className="font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
                            {as.service?.name}
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                            {formatCurrency(as.priceAtTime)}
                          </span>
                        </div>
                        <div className="rounded-md border border-border/60 bg-background/80 px-2.5 py-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                            <Label
                              htmlFor={`dur-amt-${as.id}`}
                              className="text-[11px] font-medium text-muted-foreground sm:w-16 sm:shrink-0"
                            >
                              Duration
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`dur-amt-${as.id}`}
                                type="number"
                                min={0.01}
                                step={
                                  (durationUnitDrafts[as.id] ??
                                    coerceDurationUnit(as.service?.durationUnit)) === 'MINUTES'
                                    ? 1
                                    : 0.01
                                }
                                disabled={!canEditDurations}
                                className="h-8 w-[4.75rem] text-xs tabular-nums"
                                value={durationAmountDrafts[as.id] ?? ''}
                                onChange={(e) =>
                                  setDurationAmountDrafts((prev) => ({ ...prev, [as.id]: e.target.value }))
                                }
                              />
                              <Select
                                value={durationUnitDrafts[as.id] ?? coerceDurationUnit(as.service?.durationUnit)}
                                disabled={!canEditDurations}
                                onValueChange={(value: DurationUnit) => {
                                  const oldUnit =
                                    durationUnitDrafts[as.id] ?? coerceDurationUnit(as.service?.durationUnit)
                                  const rawAmt = parseFloat(String(durationAmountDrafts[as.id] ?? '').trim())
                                  const totalMin =
                                    Number.isFinite(rawAmt) && rawAmt > 0
                                      ? durationToMinutes(rawAmt, oldUnit)
                                      : Number(as.durationAtTime || 0)
                                  const nextAmt = minutesToDurationAmount(totalMin, value)
                                  setDurationUnitDrafts((prev) => ({ ...prev, [as.id]: value }))
                                  setDurationAmountDrafts((prev) => ({
                                    ...prev,
                                    [as.id]:
                                      value === 'MINUTES'
                                        ? String(Math.round(nextAmt))
                                        : String(nextAmt % 1 === 0 ? nextAmt : Math.round(nextAmt * 100) / 100),
                                  }))
                                }}
                              >
                                <SelectTrigger id={`dur-unit-${as.id}`} className="h-8 min-w-[7rem] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DURATION_UNIT_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-xs">
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground border-t border-border/40 pt-1.5">
                            Stored:{' '}
                            <span className="tabular-nums text-foreground/80">
                              {(() => {
                                const u = durationUnitDrafts[as.id] ?? coerceDurationUnit(as.service?.durationUnit)
                                const a = parseFloat(String(durationAmountDrafts[as.id] ?? '').trim())
                                const mins =
                                  Number.isFinite(a) && a > 0
                                    ? durationToMinutes(a, u)
                                    : Number(as.durationAtTime || 0)
                                return formatDuration(mins, u)
                              })()}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 sm:items-center sm:border-l sm:border-border/50 sm:pl-4">
                        {as.pipelineProject?.id ? (
                          <div
                            className="flex w-full items-center gap-1.5 rounded-md border border-emerald-200/90 bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-900 sm:w-auto sm:py-1.5"
                            title="This booked line is linked to your projects pipeline"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                            <span>
                              In pipeline
                              {as.pipelineProject.stage?.name ? (
                                <span className="text-emerald-800/90">: {as.pipelineProject.stage.name}</span>
                              ) : null}
                            </span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-full text-xs sm:w-auto sm:whitespace-nowrap"
                            disabled={!!addingToPipeline}
                            onClick={async () => {
                              if (!currentAppointment?.client || !as.service?.name) return
                              setAddingToPipeline(as.id)
                              try {
                                await createProjectFromAppointmentService({
                                  appointmentServiceId: as.id,
                                  serviceName: as.service.name,
                                  servicePrice: as.priceAtTime ?? 0,
                                  clientName: getClientDisplayName(currentAppointment.client),
                                  appointmentDate: currentAppointment.startAt
                                    ? format(new Date(currentAppointment.startAt), 'MMM d, yyyy h:mm a')
                                    : undefined,
                                })
                                toast({
                                  title: 'Added to project pipeline',
                                  description: `${as.service.name} was added to the New stage.`,
                                })
                                dispatchSyncEvent('project-created')
                                try {
                                  const refresh = await fetch(
                                    `/api/appointments/${currentAppointment.id}?t=${Date.now()}`,
                                  )
                                  if (refresh.ok) {
                                    const next = await refresh.json()
                                    setCurrentAppointment(next)
                                  }
                                } catch {
                                  /* keep local state; reopen dialog refetches */
                                }
                              } catch (err) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Failed to add to pipeline',
                                  description: err instanceof Error ? err.message : 'Something went wrong.',
                                })
                              } finally {
                                setAddingToPipeline(null)
                              }
                            }}
                          >
                            {addingToPipeline === as.id ? (
                              'Adding...'
                            ) : (
                              <>
                                <FolderPlus className="h-3.5 w-3.5 mr-1" />
                                Add to project pipeline
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {canEditDurations && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={isSavingDurations}
                    onClick={handleSaveDurations}
                  >
                    {isSavingDurations ? 'Saving…' : 'Save duration changes'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentAppointment.payments && currentAppointment.payments.length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-pink-600" />
                Payment History
              </p>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {currentAppointment.payments.map((payment: any, index: number) => {
                  const paymentMethodLabel = payment.paymentMethod === 'CASH' ? 'Cash' :
                                            payment.paymentMethod === 'BANK' ? 'Bank' :
                                            payment.paymentMethod === 'WALLET' ? 'Wallet' :
                                            payment.paymentMethod === 'WIRE' ? 'Wire' :
                                            payment.paymentMethod === 'CARD' ? 'Card / Online' :
                                            payment.paymentMethod === 'CHECK' ? 'Check' :
                                            payment.paymentMethod === 'OTHER' ? 'Other' :
                                            payment.paymentMethod || 'N/A'
                  const isRefund = Boolean(payment.isRefund)
                  const urls: string[] = Array.isArray(payment.attachmentUrls) ? payment.attachmentUrls : []

                  return (
                    <div
                      key={payment.id || index}
                      className={`flex justify-between items-start p-2.5 rounded-md border shadow-sm ${
                        isRefund ? 'bg-amber-50/80 border-amber-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <div
                          className={`p-1.5 rounded-md flex-shrink-0 ${
                            isRefund
                              ? 'bg-amber-100 text-amber-800'
                              : payment.paymentMethod === 'CASH'
                                ? 'bg-green-100 text-green-700'
                                : payment.paymentMethod === 'BANK'
                                  ? 'bg-blue-100 text-blue-700'
                                  : payment.paymentMethod === 'WALLET'
                                    ? 'bg-pink-100 text-pink-700'
                                    : payment.paymentMethod === 'WIRE'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isRefund ? (
                            <Undo2 className="h-4 w-4" />
                          ) : payment.paymentMethod === 'CASH' ? (
                            <Wallet className="h-4 w-4" />
                          ) : payment.paymentMethod === 'BANK' ? (
                            <Landmark className="h-4 w-4" />
                          ) : payment.paymentMethod === 'WALLET' ? (
                            <Wallet className="h-4 w-4" />
                          ) : payment.paymentMethod === 'WIRE' ? (
                            <Send className="h-4 w-4" />
                          ) : payment.paymentMethod === 'CARD' ? (
                            <CreditCard className="h-4 w-4" />
                          ) : (
                            <DollarSign className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span
                              className={`font-semibold text-sm ${isRefund ? 'text-amber-950' : 'text-gray-900'}`}
                            >
                              {isRefund ? '−' : ''}
                              {formatCurrency(Number(payment.amount || 0))}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 ${
                                isRefund
                                  ? 'border-amber-300 text-amber-900 bg-amber-100/50'
                                  : 'border-gray-300 text-gray-700'
                              }`}
                            >
                              {isRefund ? 'Refund' : paymentMethodLabel}
                            </Badge>
                          </div>
                          {payment.paidAt && (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(payment.paidAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          )}
                          {payment.notes && (
                            <p className="text-[10px] text-gray-500 mt-1 italic">{payment.notes}</p>
                          )}
                          {urls.length > 0 && (
                            <div className="mt-1.5 flex flex-col gap-0.5">
                              {urls.map((url: string, i: number) => (
                                <a
                                  key={`${payment.id}-att-${i}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-pink-700 hover:underline [overflow-wrap:anywhere]"
                                >
                                  <Paperclip className="h-3 w-3 shrink-0" />
                                  {url.split('/').pop() || `Attachment ${i + 1}`}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {(() => {
                  const totalPrice = Number(currentAppointment.totalPrice || 0)
                  const grossPaid = grossPaymentsTotal(currentAppointment.payments)
                  const netPaid = netPaymentsTotal(currentAppointment.payments)
                  const balanceDue = invoiceBalanceDue(totalPrice, currentAppointment.payments)
                  const refunded = refundsTotal(currentAppointment.payments)
                  
                  return (
                    <div className="pt-2 mt-2 border-t border-gray-300 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">Total Price:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(totalPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">Payments received:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(grossPaid)}</span>
                      </div>
                      {refunded > 0.01 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-amber-800 font-medium">Refunds:</span>
                          <span className="font-semibold text-amber-900">{formatCurrency(refunded)}</span>
                        </div>
                      )}
                      {refunded > 0.01 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 font-medium">Net after refunds:</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(netPaid)}</span>
                        </div>
                      )}
                      {balanceDue > 0.01 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-orange-600 font-medium">Balance due:</span>
                          <span className="font-semibold text-orange-600">{formatCurrency(balanceDue)}</span>
                        </div>
                      )}
                      {balanceDue <= 0.01 && totalPrice > 0 && (
                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="text-green-600 font-semibold">Status:</span>
                          <Badge className="bg-green-600 text-white border-0 text-xs">Invoice paid</Badge>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {currentAppointment.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Notes</p>
              <p className="text-xs p-2.5 rounded-md bg-muted/50 whitespace-pre-wrap">{currentAppointment.notes}</p>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Edit Appointment</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="editClient">Client *</Label>
                  <Select value={editClientId} onValueChange={setEditClientId}>
                    <SelectTrigger id="editClient">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {getClientDisplayName(client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editStaff">Staff *</Label>
                  <Select value={editStaffId} onValueChange={setEditStaffId}>
                    <SelectTrigger id="editStaff">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name || s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="editStartAt">Start Time *</Label>
                  <Input
                    id="editStartAt"
                    type="datetime-local"
                    value={editStartAt}
                    onChange={(e) => setEditStartAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="editEndAt">End Time *</Label>
                  <Input
                    id="editEndAt"
                    type="datetime-local"
                    value={editEndAt}
                    onChange={(e) => setEditEndAt(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Services *</Label>
                <div className="mt-1.5 space-y-1.5 max-h-48 overflow-y-auto border rounded-md p-2.5">
                  {services.filter((s) => s.isActive).map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${service.id}`}
                        checked={editServiceIds.includes(service.id)}
                        onCheckedChange={() => handleServiceToggle(service.id)}
                      />
                      <label
                        htmlFor={`edit-${service.id}`}
                        className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {service.name} - {formatDuration(service.durationMinutes, service.durationUnit)} - ${Number(service.price).toFixed(2)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="editStatus">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="editStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOOKED">BOOKED</SelectItem>
                    <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                    <SelectItem value="LATE_CANCEL">LATE_CANCEL</SelectItem>
                    <SelectItem value="NO_SHOW">NO_SHOW</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : isRescheduling ? (
            <div className="space-y-3 pt-3 border-t">
              <div>
                <h3 className="font-semibold text-sm mb-2">Reschedule Appointment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="newStartAt">New Start Time</Label>
                    <Input
                      id="newStartAt"
                      type="datetime-local"
                      value={newStartAt || formatForInput(currentAppointment.startAt)}
                      onChange={(e) => setNewStartAt(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newEndAt">New End Time</Label>
                    <Input
                      id="newEndAt"
                      type="datetime-local"
                      value={newEndAt || formatForInput(currentAppointment.endAt)}
                      onChange={(e) => setNewEndAt(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReschedule}>
                  Save Reschedule
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRescheduling(false)
                    setNewStartAt('')
                    setNewEndAt('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t">
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="gap-1.5 text-xs border-pink-200 text-pink-700 hover:bg-pink-50 hover:text-pink-800"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {(currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED') && (
                  <Button
                    variant="outline"
                    onClick={() => setIsRescheduling(true)}
                    size="sm"
                    className="gap-1.5 text-xs"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Reschedule
                  </Button>
                )}
                {currentStatus === 'BOOKED' && (
                  <>
                    <Button 
                      onClick={handleApproveAppointment}
                      size="sm"
                      className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button 
                      onClick={handleRejectAppointment}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </>
                )}
                {(() => {
                  const totalPrice = Number(currentAppointment.totalPrice || 0)
                  const netPaid = netPaymentsTotal(currentAppointment.payments)
                  const balanceDue = invoiceBalanceDue(totalPrice, currentAppointment.payments)
                  const hasPrice = totalPrice > 0
                  
                  return (
                    <>
                      {hasPrice && balanceDue > 0.01 && (
                        <Button
                          variant="outline"
                          onClick={() => setIsPaymentDialogOpen(true)}
                          size="sm"
                          className="gap-1.5 text-xs border-pink-200 text-pink-700 hover:bg-pink-50 hover:text-pink-800"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Pay Now
                        </Button>
                      )}
                      {hasPrice && netPaid > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setIsRefundDialogOpen(true)}
                          size="sm"
                          className="gap-1.5 text-xs border-amber-200 text-amber-900 hover:bg-amber-50"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Refund
                        </Button>
                      )}
                    </>
                  )
                })()}
                {(currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED') && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('COMPLETED')}
                    size="sm"
                    className="gap-1.5 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Complete
                  </Button>
                )}
                {(currentStatus === 'CONFIRMED' || currentStatus === 'BOOKED') && (
                  <Button
                    variant="outline"
                    onClick={handleSendWhatsApp}
                    size="sm"
                    className="gap-1.5 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Send WhatsApp
                  </Button>
                )}
                {(currentStatus !== 'CANCELLED' && currentStatus !== 'NO_SHOW') && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange('CANCELLED')}
                      size="sm"
                      className="gap-1.5 text-xs border-gray-200 hover:bg-gray-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange('LATE_CANCEL')}
                      size="sm"
                      className="gap-1.5 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      Late
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusChange('NO_SHOW')}
                      size="sm"
                      className="gap-1.5 text-xs"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      No Show
                    </Button>
                  </>
                )}
                {/* Undo button - shown when appointment was just cancelled */}
                {showUndo && previousStatus && (
                  <Button
                    variant="outline"
                    onClick={handleUndo}
                    size="sm"
                    className="gap-1.5 text-xs border-pink-200 text-pink-700 hover:bg-pink-50 hover:text-pink-800 animate-pulse"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Undo
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Client Profile Modal */}
    {isClientModalOpen && selectedClient && (
      <ClientModal
        client={selectedClient}
        open={isClientModalOpen}
        onOpenChange={setIsClientModalOpen}
        clients={clients}
        services={services}
        staff={staff}
      />
    )}
    <PaymentDialog
      open={isPaymentDialogOpen}
      onOpenChange={setIsPaymentDialogOpen}
      appointment={currentAppointment}
      onPaymentAdded={async () => {
        // Fetch fresh appointment data immediately
        try {
          const response = await fetch(`/api/appointments/${currentAppointment.id}?t=${Date.now()}`)
          if (response.ok) {
            const updatedAppointment = await response.json()
            setCurrentAppointment(updatedAppointment)
          }
        } catch (error) {
          console.error('Failed to refresh appointment:', error)
        }
        // Also refresh the page data
        router.refresh()
        // Dispatch sync event to notify other components
        dispatchSyncEvent('payment-recorded', { 
          appointmentId: currentAppointment.id,
          clientId: currentAppointment.clientId 
        })
      }}
    />
    <RefundDialog
      open={isRefundDialogOpen}
      onOpenChange={setIsRefundDialogOpen}
      appointment={currentAppointment}
      onRefundRecorded={async () => {
        try {
          const response = await fetch(`/api/appointments/${currentAppointment.id}?t=${Date.now()}`)
          if (response.ok) {
            const updatedAppointment = await response.json()
            setCurrentAppointment(updatedAppointment)
          }
        } catch (error) {
          console.error('Failed to refresh appointment:', error)
        }
        router.refresh()
        dispatchSyncEvent('payment-recorded', {
          appointmentId: currentAppointment.id,
          clientId: currentAppointment.clientId,
        })
      }}
    />

    {/* WhatsApp Notification Dialog */}
    <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Notification Ready
          </DialogTitle>
        </DialogHeader>
        {whatsappMessage && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            <div>
              <Label className="text-xs font-medium">Message Preview:</Label>
              <div className="mt-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                <p className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{whatsappMessage.message}</p>
              </div>
            </div>
            {whatsappMessage.phoneNumber ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium">Client Phone:</Label>
                  <p className="text-xs text-gray-600 mt-1 break-all">{whatsappMessage.phoneNumber}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={copyWhatsAppMessage}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Message
                  </Button>
                  <Button
                    onClick={() => window.open(whatsappMessage.whatsappUrl, '_blank')}
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open WhatsApp
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 leading-relaxed">
                  No phone number available for this client. Please add a phone number to send WhatsApp notifications.
                </p>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end pt-3 border-t flex-shrink-0">
          <Button onClick={() => setShowWhatsAppDialog(false)} variant="outline" size="sm" className="h-8 text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
