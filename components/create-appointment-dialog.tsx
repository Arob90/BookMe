'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { formatTime, formatDuration, getClientDisplayName } from '@/lib/utils'
import { createAppointment } from '@/app/actions/appointments'
import { createClient } from '@/app/actions/clients'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { UserPlus } from 'lucide-react'

interface CreateAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  services: any[]
  clients: any[]
  staff: any[]
  initialDate?: Date
  initialHour?: number
  initialMinute?: number
  onClientCreated?: (client: any) => void
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  services,
  clients,
  staff,
  initialDate,
  initialHour,
  initialMinute,
  onClientCreated,
}: CreateAppointmentDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [clientId, setClientId] = useState('')
  const [staffId, setStaffId] = useState(staff[0]?.id || '')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [startAt, setStartAt] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHourPicker, setShowHourPicker] = useState(false)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [isCreatingClient, setIsCreatingClient] = useState(false)

  // Initialize date/time when dialog opens or initialDate/hour changes
  useEffect(() => {
    if (open && initialDate) {
      const date = new Date(initialDate)
      if (initialHour !== undefined) {
        // Use provided hour and minute (default to 0 if minute not provided)
        date.setHours(initialHour, initialMinute !== undefined ? initialMinute : 0, 0, 0)
        setStartAt(formatForInput(date))
        setShowHourPicker(false)
      } else {
        // Month view: show time picker
        setShowHourPicker(true)
        setStartAt('')
      }
    } else if (open && !initialDate) {
      // Default to current time rounded to next 15-minute interval
      const now = new Date()
      const minutes = now.getMinutes()
      const roundedMinutes = Math.ceil(minutes / 15) * 15
      now.setMinutes(roundedMinutes, 0, 0)
      if (roundedMinutes === 60) {
        now.setHours(now.getHours() + 1, 0, 0, 0)
      }
      setStartAt(formatForInput(now))
      setShowHourPicker(false)
    }
    
    // Reset form when dialog closes
    if (!open) {
      setClientId('')
      setSelectedServices([])
      setNotes('')
      setShowNewClientForm(false)
      setNewClient({ firstName: '', lastName: '', email: '', phone: '' })
      setShowHourPicker(false)
    }
  }, [open, initialDate, initialHour, initialMinute])

  const formatForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Keep appointment slots practical for scheduling UI:
  // - MINUTES/HOURS use configured duration (capped to 8h per service)
  // - DAYS/MONTHS/YEARS use a 60-minute booking slot
  const getSchedulableMinutes = (service: any) => {
    const minutes = Number(service?.durationMinutes || 0)
    if (!Number.isFinite(minutes) || minutes <= 0) return 0
    const unit = String(service?.durationUnit || 'MINUTES').toUpperCase()
    if (unit === 'DAYS' || unit === 'MONTHS' || unit === 'YEARS') return 60
    return Math.min(minutes, 8 * 60)
  }

  const calculateEndTime = (start: string, serviceIds: string[]) => {
    if (!start || serviceIds.length === 0) return ''
    const startDate = new Date(start)
    const totalDuration = serviceIds.reduce((sum, id) => {
      const service = services.find((s) => s.id === id)
      return sum + getSchedulableMinutes(service)
    }, 0)
    const endDate = new Date(startDate.getTime() + totalDuration * 60000)
    return formatForInput(endDate)
  }

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  const handleCreateClient = async () => {
    if (!newClient.firstName || !newClient.lastName) {
      toast({
        title: 'Error',
        description: 'First name and last name are required',
        variant: 'destructive',
      })
      return
    }

    setIsCreatingClient(true)
    try {
      const createdClient = await createClient({
        type: 'INDIVIDUAL',
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        email: newClient.email || undefined,
        phone: newClient.phone || undefined,
        tags: [],
      })
      
      toast({
        title: 'Success',
        description: 'Client created successfully',
      })
      
      // Select the newly created client
      setClientId(createdClient.id)
      setShowNewClientForm(false)
      setNewClient({ firstName: '', lastName: '', email: '', phone: '' })
      
      // Refresh clients list
      router.refresh()
      
      // Notify parent if callback provided
      if (onClientCreated) {
        onClientCreated(createdClient)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingClient(false)
    }
  }

  const handleSubmit = async () => {
    if (!clientId || !staffId || selectedServices.length === 0 || !startAt) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    const endAt = calculateEndTime(startAt, selectedServices)
    if (!endAt) {
      toast({
        title: 'Error',
        description: 'Could not calculate end time',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createAppointment({
        clientId,
        staffId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        serviceIds: selectedServices,
        notes: notes || undefined,
        status: 'BOOKED',
      })
      toast({
        title: 'Success',
        description: 'Appointment created successfully',
      })
      router.refresh()
      // Dispatch sync event
      if (typeof window !== 'undefined') {
        const { dispatchSyncEvent } = require('@/lib/sync-events')
        dispatchSyncEvent('appointment-created')
      }
      onOpenChange(false)
      // Reset form
      setClientId('')
      setSelectedServices([])
      setNotes('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create appointment',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const endAt = calculateEndTime(startAt, selectedServices)
  const totalPrice = selectedServices.reduce((sum, id) => {
    const service = services.find((s) => s.id === id)
    return sum + (service ? Number(service.price) : 0)
  }, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Create New Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="client">Client *</Label>
                {!showNewClientForm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewClientForm(true)}
                    className="h-7 text-xs gap-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    New Client
                  </Button>
                )}
              </div>
              {showNewClientForm ? (
                <div className="space-y-2 p-2.5 border rounded-md bg-muted/50">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newClient.firstName}
                        onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                        placeholder="First name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newClient.lastName}
                        onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                        placeholder="Last name"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        placeholder="Email (optional)"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-xs">Phone</Label>
                      <Input
                        id="phone"
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        placeholder="Phone (optional)"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleCreateClient}
                      disabled={isCreatingClient}
                      size="sm"
                      className="h-7 text-xs"
                    >
                      {isCreatingClient ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewClientForm(false)
                        setNewClient({ firstName: '', lastName: '', email: '', phone: '' })
                      }}
                      size="sm"
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const individuals = clients.filter((c: any) => c.type !== 'COMPANY')
                      const companies = clients.filter((c: any) => c.type === 'COMPANY')
                      return (
                        <>
                          {companies.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-xs uppercase">Companies</SelectLabel>
                              {companies.map((client: any) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {getClientDisplayName(client)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                          {individuals.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-xs uppercase">
                                {companies.length > 0 ? 'Individuals' : 'Clients'}
                              </SelectLabel>
                              {individuals.map((client: any) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {getClientDisplayName(client)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </>
                      )
                    })()}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label htmlFor="staff">Staff *</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger id="staff">
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

          {showHourPicker && initialDate ? (
            <div>
              <Label>Select Time *</Label>
              <div className="mt-2 grid grid-cols-4 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {Array.from({ length: 24 }, (_, i) => i).flatMap((hour) => 
                  [0, 15, 30, 45].map((minute) => {
                    const date = new Date(initialDate)
                    date.setHours(hour, minute, 0, 0)
                    return (
                      <Button
                        key={`${hour}-${minute}`}
                        variant="outline"
                        onClick={() => {
                          setStartAt(formatForInput(date))
                          setShowHourPicker(false)
                        }}
                        className="text-xs"
                      >
                        {formatTime(date)}
                      </Button>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startAt" className="text-sm">Start Time *</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endAt">End Time</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={endAt}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm">Services *</Label>
            <div className="mt-1.5 space-y-3 max-h-48 overflow-y-auto border rounded-md p-2.5">
              {(() => {
                const activeServices = services.filter((s: any) => s.isActive)
                const byCategory = activeServices.reduce((acc: Record<string, any[]>, s: any) => {
                  const catName = s.category?.name || 'Other'
                  if (!acc[catName]) acc[catName] = []
                  acc[catName].push(s)
                  return acc
                }, {})
                const sortedCats = Object.keys(byCategory).sort()
                return sortedCats.map((catName) => (
                  <div key={catName}>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5 px-0.5">{catName}</div>
                    <div className="space-y-1">
                      {byCategory[catName].map((service: any) => (
                        <div key={service.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={service.id}
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={() => handleServiceToggle(service.id)}
                          />
                          <label
                            htmlFor={service.id}
                            className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {service.name} - {formatDuration(service.durationMinutes, service.durationUnit)} - ${Number(service.price).toFixed(2)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {totalPrice > 0 && (
            <div className="p-2.5 bg-muted rounded-md">
              <p className="text-xs font-medium">
                Total Price: <span className="font-bold">${totalPrice.toFixed(2)}</span>
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="notes" className="text-sm">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
