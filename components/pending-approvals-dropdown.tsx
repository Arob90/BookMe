'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { dispatchSyncEvent } from '@/lib/sync-events'

interface PendingApproval {
  id: string
  client: {
    firstName: string
    lastName: string
  }
  startAt: string
  endAt: string
  totalPrice: number
  appointmentServices: Array<{
    service: {
      name: string
    }
  }>
}

interface PendingApprovalsDropdownProps {
  approvals: PendingApproval[]
  onRefresh?: () => void
}

export function PendingApprovalsDropdown({ approvals, onRefresh }: PendingApprovalsDropdownProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null)

  const handleApprove = async (appointmentId: string) => {
    setProcessingId(appointmentId)
    try {
      const response = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, status: 'CONFIRMED' }),
      })

      if (!response.ok) throw new Error('Failed to approve appointment')

      toast({
        title: 'Success',
        description: 'Appointment approved successfully',
      })

      router.refresh()
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve appointment',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (appointmentId: string) => {
    setProcessingId(appointmentId)
    try {
      const response = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, status: 'CANCELLED' }),
      })

      if (!response.ok) throw new Error('Failed to reject appointment')

      toast({
        title: 'Success',
        description: 'Appointment rejected',
      })

      router.refresh()
      // Dispatch sync event to notify all pages
      dispatchSyncEvent('appointment-updated', { appointmentId, status: 'CONFIRMED' })
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject appointment',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleViewInCalendar = (appointmentId: string, startAt: string) => {
    const date = new Date(startAt).toISOString().split('T')[0]
    router.push(`/app/calendar?date=${date}&appointmentId=${appointmentId}`)
    setIsOpen(false)
  }

  const handleSendWhatsApp = async (appointmentId: string) => {
    setSendingWhatsAppId(appointmentId)
    try {
      const whatsappResponse = await fetch(`/api/whatsapp?appointmentId=${appointmentId}`)
      if (whatsappResponse.ok) {
        const whatsappData = await whatsappResponse.json()
        if (whatsappData.whatsappUrl) {
          // Open WhatsApp in new tab
          window.open(whatsappData.whatsappUrl, '_blank')
          toast({
            title: 'Success',
            description: 'WhatsApp message opened',
          })
        } else {
          throw new Error('No WhatsApp URL generated')
        }
      } else {
        throw new Error('Failed to generate WhatsApp message')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate WhatsApp message',
        variant: 'destructive',
      })
    } finally {
      setSendingWhatsAppId(null)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
          <Calendar className="h-5 w-5 text-gray-600" />
          {approvals.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {approvals.length > 9 ? '9+' : approvals.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Pending Approvals</span>
          {approvals.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {approvals.length}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {approvals.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No pending approvals
          </div>
        ) : (
          approvals.map((approval) => {
            const services = approval.appointmentServices.map((as) => as.service.name).join(', ')
            const isProcessing = processingId === approval.id
            const isSendingWhatsApp = sendingWhatsAppId === approval.id

            return (
              <div key={approval.id} className="p-3 border-b last:border-b-0">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {approval.client.firstName} {approval.client.lastName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTime(approval.startAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{services}</p>
                      <p className="text-xs font-medium text-pink-600 mt-1">
                        ${Number(approval.totalPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-2 flex-wrap">
                    <Button
                      onClick={() => handleApprove(approval.id)}
                      disabled={isProcessing || isSendingWhatsApp}
                      size="sm"
                      className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(approval.id)}
                      disabled={isProcessing || isSendingWhatsApp}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleSendWhatsApp(approval.id)}
                      disabled={isProcessing || isSendingWhatsApp}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
                      title="Send WhatsApp Confirmation"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      onClick={() => handleViewInCalendar(approval.id, approval.startAt)}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="View in Calendar"
                    >
                      <Calendar className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
        {approvals.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                router.push('/app/calendar')
                setIsOpen(false)
              }}
              className="text-center justify-center"
            >
              View All in Calendar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
