'use client'

import { useState, useMemo, useEffect, useRef, memo } from 'react'
import { onSyncEvent } from '@/lib/sync-events'
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from 'date-fns'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, Archive, X, PartyPopper, ChevronDown, Calendar, CheckSquare, Bell, Pencil, Trash2, Clock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatTime, formatCurrency, getInitials, isBirthdayOnDate, isBirthdayThisMonth } from '@/lib/utils'
import { invoiceBalanceDue } from '@/lib/payment-net'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AppointmentDialog } from '@/components/appointment-dialog'
import { CreateAppointmentDialog } from '@/components/create-appointment-dialog'
import { AppointmentArchive } from '@/components/appointment-archive'
import { PaymentDialog } from '@/components/payment-dialog'
import { AddTaskDialog, formatTaskAppointmentPickLabel, type TaskAppointmentPick } from '@/components/add-task-dialog'
import { AddReminderDialog } from '@/components/add-reminder-dialog'
import { EditTaskDialog } from '@/components/edit-task-dialog'
import { EditReminderDialog } from '@/components/edit-reminder-dialog'
import { deleteAppointment, rescheduleAppointment } from '@/app/actions/appointments'
import { toggleTaskComplete, deleteTask } from '@/app/actions/tasks'
import { deleteReminder, toggleReminderComplete } from '@/app/actions/reminders'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
// Types will be inferred from props

interface CalendarViewProps {
  initialAppointments: any[]
  initialTasks?: any[]
  initialReminders?: any[]
  services: any[]
  clients: any[]
  staff: any[]
  initialDate?: string
  initialAppointmentId?: string
}

const colorMap: Record<string, string> = {
  pink: 'bg-pink-100 border-pink-300 text-pink-900',
  purple: 'bg-purple-100 border-purple-300 text-purple-900',
  blue: 'bg-pink-100 border-pink-300 text-pink-900',
  green: 'bg-green-100 border-green-300 text-green-900',
  orange: 'bg-orange-100 border-orange-300 text-orange-900',
  red: 'bg-red-100 border-red-300 text-red-900',
  yellow: 'bg-yellow-100 border-yellow-300 text-yellow-900',
}

const statusColors: Record<string, string> = {
  BOOKED: 'border-purple-400 border-2 bg-purple-100',
  CONFIRMED: 'border-green-500 border-2 bg-green-100',
  COMPLETED: 'border-green-500 border-2 bg-green-50',
  CANCELLED: 'border-red-500 border-2 bg-red-100',
  LATE_CANCEL: 'border-orange-500 border-2 bg-orange-50',
  NO_SHOW: 'border-orange-500 border-2 bg-orange-100',
}

const statusBadgeClass: Record<string, string> = {
  BOOKED: 'bg-purple-100 text-purple-800 border-purple-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  COMPLETED: 'bg-gray-100 text-gray-800 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  LATE_CANCEL: 'bg-orange-100 text-orange-800 border-orange-200',
  NO_SHOW: 'bg-orange-100 text-orange-800 border-orange-200',
}

function formatAppointmentStatusLabel(status: string) {
  const map: Record<string, string> = {
    BOOKED: 'Booked',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    LATE_CANCEL: 'Late cancel',
    NO_SHOW: 'No show',
  }
  return map[status] || status.replace(/_/g, ' ')
}

function CalendarView({ initialAppointments, initialTasks = [], initialReminders = [], services, clients, staff, initialDate, initialAppointmentId }: CalendarViewProps) {
  const { toast } = useToast()
  const router = useRouter()
  const hasInitializedDate = useRef(false)
  
  // Initialize currentDate from URL parameter if provided
  const getInitialDate = () => {
    if (initialDate) {
      try {
        const parsedDate = parseISO(initialDate)
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate
        }
      } catch (e) {
        console.error('Invalid date parameter:', initialDate)
      }
    }
    return new Date()
  }
  
  const [currentDate, setCurrentDate] = useState(getInitialDate())
  const [view, setView] = useState<'day' | 'week' | 'month'>(initialDate ? 'day' : 'week')
  const [selectedDay, setSelectedDay] = useState<Date | null>(initialDate ? getInitialDate() : null)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [createDate, setCreateDate] = useState<Date | undefined>()
  const [createHour, setCreateHour] = useState<number | undefined>()
  const [createMinute, setCreateMinute] = useState<number | undefined>()
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ day: Date; hour: number; minute: number } | null>(null)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [paymentAppointment, setPaymentAppointment] = useState<any>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false)
  const [isEditReminderOpen, setIsEditReminderOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editingReminder, setEditingReminder] = useState<any>(null)
  
  // Filter out cancelled appointments from active view
  const activeAppointments = useMemo(() => {
    return initialAppointments.filter((apt) => apt.status !== 'CANCELLED')
  }, [initialAppointments])
  
  // Get cancelled appointments for archive
  const cancelledAppointments = useMemo(() => {
    return initialAppointments.filter((apt) => apt.status === 'CANCELLED')
  }, [initialAppointments])

  const appointmentLinkOptions = useMemo((): TaskAppointmentPick[] => {
    return [...activeAppointments]
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((apt) => ({
        id: apt.id,
        startAt: apt.startAt,
        client: apt.client,
      }))
  }, [activeAppointments])

  const openAppointmentById = (id: string) => {
    const apt = initialAppointments.find((a) => a.id === id)
    if (apt) {
      setSelectedAppointment(apt)
      setIsDialogOpen(true)
    } else {
      toast({
        title: 'Appointment not loaded',
        description: 'Refresh the calendar or pick a month that includes this booking.',
        variant: 'destructive',
      })
    }
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Generate time slots with 15-minute intervals (00, 15, 30, 45 for each hour)
  const timeSlots = useMemo(() => {
    const slots: Array<{ hour: number; minute: number }> = []
    for (let hour = 0; hour < 24; hour++) {
      slots.push({ hour, minute: 0 })
      slots.push({ hour, minute: 15 })
      slots.push({ hour, minute: 30 })
      slots.push({ hour, minute: 45 })
    }
    return slots
  }, [])

  const hours = Array.from({ length: 24 }, (_, i) => i) // 12am (0) to 11pm (23) - kept for month view

  const filteredAppointments = useMemo(() => {
    if (view === 'day') {
      return activeAppointments.filter((apt) =>
        isSameDay(new Date(apt.startAt), currentDate)
      )
    }
    if (view === 'week') {
      return activeAppointments.filter((apt) => {
        const aptDate = new Date(apt.startAt)
        return weekDays.some((day) => isSameDay(aptDate, day))
      })
    }
    return activeAppointments
  }, [activeAppointments, currentDate, view, weekDays])

  const weekTaskCounts = useMemo(() => {
    const counts = new Map<string, number>()
    if (view !== 'week') return counts
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd')
      const count = initialTasks.filter((t) => isSameDay(new Date(t.dueAt), day)).length
      counts.set(key, count)
    }
    return counts
  }, [view, weekDays, initialTasks])

  const getAppointmentsForSlot = (day: Date, hour: number, minute: number = 0) => {
    return filteredAppointments.filter((apt) => {
      const aptStart = new Date(apt.startAt)
      const aptEnd = new Date(apt.endAt)
      const slotStart = new Date(day)
      slotStart.setHours(hour, minute, 0, 0)
      const slotEnd = new Date(day)
      if (minute === 45) {
        slotEnd.setHours(hour + 1, 0, 0, 0)
      } else {
        slotEnd.setHours(hour, minute + 15, 0, 0)
      }
      
      // Check if appointment overlaps with this time slot
      return (
        isSameDay(aptStart, day) &&
        aptStart < slotEnd &&
        aptEnd > slotStart
      )
    })
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const change = view === 'day' ? 1 : view === 'week' ? 7 : 30
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + (direction === 'next' ? change : -change))
      return newDate
    })
  }

  // Get appointments for selected day
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDay) return []
    return activeAppointments.filter((apt) => 
      isSameDay(new Date(apt.startAt), selectedDay)
    ).sort((a, b) => {
      const timeA = new Date(a.startAt).getTime()
      const timeB = new Date(b.startAt).getTime()
      return timeA - timeB
    })
  }, [selectedDay, activeAppointments])

  // Get tasks for selected day
  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return []
    return initialTasks.filter((t) => isSameDay(new Date(t.dueAt), selectedDay))
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  }, [selectedDay, initialTasks])

  // Get reminders for selected day
  const selectedDayReminders = useMemo(() => {
    if (!selectedDay) return []
    return initialReminders.filter((r) => isSameDay(new Date(r.dueAt), selectedDay))
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  }, [selectedDay, initialReminders])

  // Handle initialDate and initialAppointmentId parameters on mount (only once)
  useEffect(() => {
    if (initialDate && !hasInitializedDate.current) {
      try {
        const parsedDate = parseISO(initialDate)
        if (!isNaN(parsedDate.getTime())) {
          setCurrentDate(parsedDate)
          setSelectedDay(parsedDate)
          setView('day')
          hasInitializedDate.current = true
        }
      } catch (e) {
        console.error('Invalid date parameter:', initialDate)
        hasInitializedDate.current = true // Mark as initialized even on error
      }
    } else if (!initialDate) {
      hasInitializedDate.current = true // Mark as initialized if no initialDate
    }
    
    // Handle initialAppointmentId - open the appointment dialog
    if (initialAppointmentId && hasInitializedDate.current) {
      const appointment = initialAppointments.find(apt => apt.id === initialAppointmentId)
      if (appointment) {
        setSelectedAppointment(appointment)
        setIsDialogOpen(true)
        // Also set the date if not already set
        if (!initialDate) {
          const aptDate = new Date(appointment.startAt)
          setCurrentDate(aptDate)
          setSelectedDay(aptDate)
          setView('day')
        }
      }
    }
  }, [initialDate, initialAppointmentId, initialAppointments])

  // Auto-select current date when view changes to day or week (only if not initialized from URL)
  useEffect(() => {
    // Skip if we haven't finished initializing
    if (!hasInitializedDate.current) {
      return
    }
    
    // Skip if we initialized from initialDate (to avoid overriding it on first render)
    if (initialDate) {
      return
    }
    
    if (view === 'day') {
      setSelectedDay(currentDate)
    } else if (view === 'week') {
      // Auto-select today when switching to week view if no day is selected
      // Use a function to get current state to avoid dependency issues
      setSelectedDay(prev => prev || currentDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate])

  return (
    <div className="flex flex-col h-full space-y-2 overflow-hidden">
      <div className="flex-1 min-h-0 flex gap-2 overflow-hidden">
      <Tabs value={view} onValueChange={(v) => {
        setView(v as any)
        if (v === 'day' && !selectedDay) {
          setSelectedDay(currentDate)
        }
      }} className="flex flex-col h-full overflow-hidden flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="day" className="flex-1 sm:flex-none text-xs sm:text-sm">Day</TabsTrigger>
            <TabsTrigger value="week" className="flex-1 sm:flex-none text-xs sm:text-sm">Week</TabsTrigger>
            <TabsTrigger value="month" className="flex-1 sm:flex-none text-xs sm:text-sm">Month</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="h-8 w-8">
                  <Plus className="h-3.5 w-3.5" />
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    setCreateDate(undefined)
                    setCreateHour(undefined)
                    setIsCreateDialogOpen(true)
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Add appointment
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCreateDate(selectedDay ?? currentDate)
                    setCreateHour(undefined)
                    setIsTaskDialogOpen(true)
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Add task
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCreateDate(selectedDay ?? currentDate)
                    setCreateHour(undefined)
                    setIsReminderDialogOpen(true)
                  }}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Add reminder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setIsArchiveOpen(true)}
              size="icon"
              variant="outline"
              className="h-8 w-8"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate('prev')}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                className="h-8 text-xs px-2"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate('next')}
                className="h-8 w-8"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <h2 className="text-xs sm:text-sm font-semibold truncate">
              {view === 'day'
                ? format(currentDate, 'EEEE, MMMM d, yyyy')
                : view === 'week'
                ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
        </div>

        <TabsContent value={view} className="flex-1 min-h-0 flex flex-col mt-2">
          {view === 'week' && (() => {
            // Show loading overlay if rescheduling
            if (isRescheduling) {
              return (
                <Card className="overflow-hidden flex-1 flex flex-col relative shadow-sm border-gray-200">
                  <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center">
                    <div className="text-sm font-medium text-gray-600">Rescheduling appointment...</div>
                  </div>
                </Card>
              )
            }
            
            // Group appointments by day and calculate positions to avoid overlaps
            const appointmentsByDay = weekDays.map((day) => {
              const dayApps = filteredAppointments.filter((apt) => {
                const aptDate = new Date(apt.startAt)
                return isSameDay(aptDate, day)
              }).sort((a, b) => {
                const timeA = new Date(a.startAt).getTime()
                const timeB = new Date(b.startAt).getTime()
                return timeA - timeB
              })

              // Calculate positions for overlapping appointments
              const positionedApps = dayApps.map((apt, index) => {
                const startTime = new Date(apt.startAt)
                const endTime = new Date(apt.endAt)
                const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
                const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()
                
                // Find overlapping appointments
                let column = 0
                for (let i = 0; i < index; i++) {
                  const otherApt = dayApps[i]
                  const otherStart = new Date(otherApt.startAt)
                  const otherEnd = new Date(otherApt.endAt)
                  const otherStartMinutes = otherStart.getHours() * 60 + otherStart.getMinutes()
                  const otherEndMinutes = otherEnd.getHours() * 60 + otherEnd.getMinutes()
                  
                  // Check if appointments overlap
                  if (
                    (startMinutes < otherEndMinutes && endMinutes > otherStartMinutes) ||
                    (otherStartMinutes < endMinutes && otherEndMinutes > startMinutes)
                  ) {
                    // They overlap, might need different column
                    // For now, we'll stack them (simple approach)
                  }
                }
                
                return {
                  ...apt,
                  startMinutes,
                  endMinutes,
                  column,
                }
              })

              return { day, appointments: positionedApps }
            })

            return (
              <Card className="overflow-hidden flex-1 flex flex-col shadow-sm border-gray-200">
                {/* Header */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 flex-shrink-0 bg-white">
                  <div className="p-2 text-xs font-semibold text-gray-700 border-r border-gray-200">Time</div>
                  {weekDays.map((day) => {
                    const isCurrentDay = isToday(day)
                    const isSelected = selectedDay && isSameDay(selectedDay, day)
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(day)}
                        className={`border-r border-gray-200 last:border-r-0 p-2 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
                          isCurrentDay 
                            ? 'bg-pink-50' 
                            : isSelected
                            ? 'bg-pink-100'
                            : 'bg-white'
                        }`}
                      >
                        <div className={`text-xs font-medium mb-1 ${
                          isCurrentDay ? 'text-pink-700' : isSelected ? 'text-pink-600' : 'text-gray-600'
                        }`}>
                          {format(day, 'EEE')}
                        </div>
                        <div className={`text-sm font-bold ${
                          isCurrentDay 
                            ? 'bg-pink-600 text-white rounded-full w-7 h-7 mx-auto flex items-center justify-center' 
                            : isSelected
                            ? 'text-pink-700'
                            : 'text-gray-900'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        {(() => {
                          const count = weekTaskCounts.get(format(day, 'yyyy-MM-dd')) || 0
                          if (count === 0) return null
                          return (
                            <div className="mt-1 text-[10px] font-medium text-pink-700">
                              {count} task{count === 1 ? '' : 's'}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>

                {/* Time slots and appointments */}
                <div className="flex-1 min-h-0 overflow-y-auto relative">
                  <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                    {/* Time column */}
                    <div className="border-r border-gray-200 bg-white sticky left-0 z-10">
                      {hours.map((hour) => {
                        return (
                          <div key={hour} className="border-b border-gray-100" style={{ height: '60px', display: 'flex', flexDirection: 'column' }}>
                            {/* Hour marker - first slot (0 minutes) - exactly 15px */}
                            <div 
                              className="border-b border-gray-100 sticky top-0 bg-white z-10 flex-shrink-0" 
                              style={{ height: '15px', display: 'flex', alignItems: 'center', paddingLeft: '4px' }}
                            >
                              <div className="text-xs font-medium text-gray-600">
                                {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                              </div>
                            </div>
                            {/* Quarter hour markers - each exactly 15px */}
                            {[15, 30, 45].map((minute) => (
                              <div 
                                key={minute} 
                                className="border-b border-gray-100 flex-shrink-0" 
                                style={{ height: '15px', display: 'flex', alignItems: 'center', paddingLeft: '4px' }}
                              >
                                <div className="text-[10px] text-gray-400">
                                  {format(new Date().setHours(hour, minute, 0, 0), 'h:mm')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>

                    {/* Day columns */}
                    {appointmentsByDay.map(({ day, appointments }) => {
                      const isCurrentDay = isToday(day)
                      return (
                        <div
                          key={day.toISOString()}
                          className={`border-r border-gray-200 last:border-r-0 relative ${
                            isCurrentDay ? 'bg-pink-50/30' : ''
                          }`}
                        >
                          {/* Time slot grid for click detection - must match time column structure exactly */}
                          {hours.map((hour) => (
                            <div key={hour} className="border-b border-gray-100" style={{ height: '60px', display: 'flex', flexDirection: 'column' }}>
                              {/* First slot (0 minutes) - exactly 15px to match time column */}
                              <div className="border-b border-gray-100 flex-shrink-0" style={{ height: '15px' }}></div>
                              {/* Quarter hour slots - each exactly 15px */}
                              {[15, 30, 45].map((minute) => {
                                const isDragOver = dragOverSlot?.day.getTime() === day.getTime() && 
                                                  dragOverSlot?.hour === hour && 
                                                  dragOverSlot?.minute === minute
                                
                                return (
                                  <div
                                    key={minute}
                                    onDragOver={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      if (draggedAppointment) {
                                        e.dataTransfer.dropEffect = 'move'
                                        setDragOverSlot({ day, hour, minute })
                                      }
                                    }}
                                    onDragLeave={(e) => {
                                      // Only clear if leaving the slot entirely
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      const x = e.clientX
                                      const y = e.clientY
                                      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                        setDragOverSlot(null)
                                      }
                                    }}
                                    onDrop={async (e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      
                                      if (!draggedAppointment) return
                                      
                                      // Calculate new start time
                                      const newStartDate = new Date(day)
                                      newStartDate.setHours(hour, minute, 0, 0)
                                      
                                      // Calculate duration
                                      const oldStart = new Date(draggedAppointment.startAt)
                                      const oldEnd = new Date(draggedAppointment.endAt)
                                      const durationMs = oldEnd.getTime() - oldStart.getTime()
                                      
                                      // Calculate new end time
                                      const newEndDate = new Date(newStartDate.getTime() + durationMs)
                                      
                                      setIsRescheduling(true)
                                      try {
                                        await rescheduleAppointment({
                                          id: draggedAppointment.id,
                                          startAt: newStartDate.toISOString(),
                                          endAt: newEndDate.toISOString(),
                                        })
                                        toast({
                                          title: 'Success',
                                          description: 'Appointment rescheduled successfully',
                                        })
                                        router.refresh()
                                      } catch (error: any) {
                                        toast({
                                          title: 'Error',
                                          description: error.message || 'Failed to reschedule appointment',
                                          variant: 'destructive',
                                        })
                                      } finally {
                                        setIsRescheduling(false)
                                        setDraggedAppointment(null)
                                        setDragOverSlot(null)
                                      }
                                    }}
                                    onDoubleClick={(e) => {
                                      if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.appointment-card') === null) {
                                        const slotDate = new Date(day)
                                        slotDate.setHours(hour, minute, 0, 0)
                                        setCreateDate(slotDate)
                                        setCreateHour(hour)
                                        setCreateMinute(minute)
                                        setIsCreateDialogOpen(true)
                                      }
                                    }}
                                    onClick={(e) => {
                                      if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.appointment-card') === null) {
                                        setSelectedDay(day)
                                      }
                                    }}
                                    className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50/50 transition-colors relative group flex-shrink-0 ${
                                      isDragOver ? 'bg-pink-100 border-pink-300 border-2' : ''
                                    }`}
                                    style={{ height: '15px' }}
                                  >
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      <Plus className="h-4 w-4 text-gray-400" />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ))}

                          {/* Appointments positioned absolutely */}
                          <div className="absolute inset-0 pointer-events-none">
                            {appointments.map((apt) => {
                              const service = apt.appointmentServices?.[0]?.service
                              const color = service?.colorTag || 'blue'
                              const status = apt.status
                              const isCancelled = status === 'CANCELLED'
                              
                              // Parse dates - ensure they're Date objects
                              const startTime = typeof apt.startAt === 'string' 
                                ? new Date(apt.startAt) 
                                : new Date(apt.startAt)
                              const endTime = typeof apt.endAt === 'string'
                                ? new Date(apt.endAt)
                                : new Date(apt.endAt)
                              
                              // Verify this appointment is for this day
                              if (!isSameDay(startTime, day)) {
                                return null
                              }
                              
                              // Get local time components
                              const startHour = startTime.getHours()
                              const startMin = startTime.getMinutes()
                              const endHour = endTime.getHours()
                              const endMin = endTime.getMinutes()
                              
                              // Calculate position from top (in pixels)
                              // Each hour = 60px, each 15 minutes = 15px
                              // So: 1 hour = 60px, 1 minute = 1px
                              const startTotalMinutes = startHour * 60 + startMin
                              const endTotalMinutes = endHour * 60 + endMin
                              
                              // Position: top in pixels (1 minute = 1px from top of scrollable area)
                              // The grid starts at hour 0 (midnight), so position is simply minutes from midnight
                              const top = startTotalMinutes
                              // Height: duration in pixels (minimum 50px for readability)
                              const height = Math.max(endTotalMinutes - startTotalMinutes, 50)
                              
                              // Debug: log to verify
                              if (apt.client?.firstName === 'Lisa' && apt.client?.lastName === 'Davis') {
                                console.log(`Lisa's appointment: ${startHour}:${startMin.toString().padStart(2, '0')} - ${endHour}:${endMin.toString().padStart(2, '0')}, top: ${top}px, height: ${height}px, day: ${format(day, 'MMM d')}`)
                              }
                              
                              const isDragging = draggedAppointment?.id === apt.id
                              
                              return (
                                <div
                                  key={apt.id}
                                  draggable={!isCancelled}
                                  onMouseDown={(e) => {
                                    // Don't prevent default - allow drag to start
                                    if (!isCancelled) {
                                      e.stopPropagation()
                                    }
                                  }}
                                  onDragStart={(e) => {
                                    console.log('Drag start', apt.id)
                                    if (isCancelled) {
                                      e.preventDefault()
                                      return false
                                    }
                                    e.stopPropagation()
                                    setDraggedAppointment(apt)
                                    e.dataTransfer.effectAllowed = 'move'
                                    e.dataTransfer.setData('text/plain', apt.id)
                                    e.dataTransfer.setData('application/json', JSON.stringify({ id: apt.id }))
                                  }}
                                  onDragEnd={(e) => {
                                    console.log('Drag end')
                                    e.stopPropagation()
                                    setDraggedAppointment(null)
                                    setDragOverSlot(null)
                                  }}
                                  onClick={(e) => {
                                    // Only open dialog if not dragging
                                    if (draggedAppointment) {
                                      return
                                    }
                                    e.stopPropagation()
                                    setSelectedAppointment(apt)
                                    setIsDialogOpen(true)
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: `${top}px`,
                                    height: `${Math.max(height, 60)}px`,
                                    left: '2px',
                                    right: '2px',
                                    pointerEvents: 'auto',
                                    opacity: isDragging ? 0.5 : 1,
                                    userSelect: 'none',
                                  }}
                                  className={`
                                    appointment-card rounded-lg border-2 p-1 hover:shadow-lg transition-all flex flex-col select-none overflow-hidden
                                    ${isCancelled ? 'bg-gray-50 border-gray-300 cursor-pointer' : 'cursor-move ' + (statusColors[status] || colorMap[color] || colorMap.blue)}
                                    ${isDragging ? 'opacity-50' : ''}
                                  `}
                                >
                                  <div className="flex flex-col justify-between h-full min-w-0">
                                    <div className="flex flex-col min-w-0">
                                      <div className={`font-semibold text-[10px] leading-tight h-3.5 flex items-center gap-0.5 truncate mb-0.5 ${isCancelled ? 'line-through text-gray-500' : ''}`}>
                                        <span className="truncate">{apt.client.firstName} {apt.client.lastName}</span>
                                        {isBirthdayThisMonth(apt.client.birthday) && (
                                          <PartyPopper className="h-2.5 w-2.5 text-pink-500 flex-shrink-0" />
                                        )}
                                      </div>
                                      <div className={`text-[9px] leading-tight h-3 flex items-center truncate min-w-0 ${isCancelled ? 'line-through text-gray-400' : 'opacity-75'}`}>
                                        {formatTime(apt.startAt)} - {formatTime(apt.endAt)}
                                      </div>
                                    </div>
                                    <div className="mt-auto pt-1 flex-shrink-0">
                                      {!isCancelled && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-[8px] px-1 py-0 h-3.5 font-medium border-gray-400 bg-white/90 w-full flex items-center justify-center rounded leading-none"
                                        >
                                          {apt.status}
                                        </Badge>
                                      )}
                                      {isCancelled && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-[8px] px-1 py-0 h-3.5 font-medium border-gray-400 bg-gray-100 w-full flex items-center justify-center rounded leading-none"
                                        >
                                          CANCELLED
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>
            )
          })()}

          {view === 'day' && (() => {
            // Get all appointments for the day
            const dayAppointments = filteredAppointments.filter((apt) =>
              isSameDay(new Date(apt.startAt), currentDate)
            )

            // Helper to calculate appointment position and size
            const getAppointmentStyle = (apt: any) => {
              // Parse the date - handle both string and Date objects
              let startTime: Date
              let endTime: Date
              
              if (typeof apt.startAt === 'string') {
                // If it's a string, parse it as ISO date
                startTime = new Date(apt.startAt)
              } else if (apt.startAt instanceof Date) {
                startTime = apt.startAt
              } else {
                // Fallback: try to construct from the object
                startTime = new Date(apt.startAt)
              }
              
              if (typeof apt.endAt === 'string') {
                endTime = new Date(apt.endAt)
              } else if (apt.endAt instanceof Date) {
                endTime = apt.endAt
              } else {
                endTime = new Date(apt.endAt)
              }
              
              // Validate the dates
              if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                console.error('Invalid date for appointment:', apt.id, apt.startAt, apt.endAt)
                return { top: '0px', height: '50px' }
              }
              
              // Get local time components (matching week view calculation)
              const startHour = startTime.getHours()
              const startMin = startTime.getMinutes()
              const endHour = endTime.getHours()
              const endMin = endTime.getMinutes()
              
              // Calculate position from top (in pixels) - 1 minute = 1px (matching week view)
              const startTotalMinutes = startHour * 60 + startMin
              const endTotalMinutes = endHour * 60 + endMin
              
              // Position: top in pixels (1 minute = 1px from top)
              const top = startTotalMinutes
              // Height: duration in pixels (minimum 70px for readability, matching week view)
              const height = Math.max(endTotalMinutes - startTotalMinutes, 70)
              
              return { top: `${top}px`, height: `${height}px` }
            }

            return (
              <Card className="overflow-hidden flex-1 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto relative">
                  {/* Render time slot grid */}
                  <div className="relative">
                    {timeSlots.map((slot, index) => {
                      // Show label for all time slots (:00, :15, :30, :45)
                      // Each 15-minute slot is 15px (matching week view: 60px per hour)
                      return (
                        <div key={`${slot.hour}-${slot.minute}`} className="grid grid-cols-[64px_1fr] border-b border-gray-100 relative flex-shrink-0" style={{ height: '15px' }}>
                          <div className="p-0.5 text-[10px] text-gray-500 border-r flex items-center whitespace-nowrap overflow-hidden">
                            {format(new Date().setHours(slot.hour, slot.minute, 0, 0), 'h:mm a')}
                          </div>
                          <div
                            className="cursor-pointer hover:bg-gray-50/50 transition-colors relative group"
                            style={{ height: '15px' }}
                            onDoubleClick={(e) => {
                              if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.appointment-card') === null) {
                                setCreateDate(currentDate)
                                setCreateHour(slot.hour)
                                setCreateMinute(slot.minute)
                                setIsCreateDialogOpen(true)
                              }
                            }}
                            onClick={(e) => {
                              if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.appointment-card') === null) {
                                setSelectedDay(currentDate)
                              }
                            }}
                          >
                            {/* Show plus icon on hover for empty slots */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Plus className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Render appointments with absolute positioning - positioned relative to the time slot grid */}
                    <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ left: '16.67%' }}>
                      {dayAppointments.map((apt) => {
                        const service = apt.appointmentServices?.[0]?.service
                        const color = service?.colorTag || 'blue'
                        const status = apt.status
                        const isCancelled = status === 'CANCELLED'
                        const { top, height } = getAppointmentStyle(apt)
                        const heightValue = parseInt(height.replace('px', ''))
                        
                        return (
                          <div
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedAppointment(apt)
                              setIsDialogOpen(true)
                            }}
                            style={{
                              position: 'absolute',
                              top,
                              height: `${Math.max(heightValue, 60)}px`,
                              left: '4px',
                              right: '4px',
                              pointerEvents: 'auto',
                            }}
                            className={`
                              appointment-card rounded-lg border-2 p-1 cursor-pointer hover:shadow-lg transition-all flex flex-col overflow-hidden
                              ${isCancelled ? 'bg-gray-50 border-gray-300' : statusColors[status] || colorMap[color] || colorMap.blue}
                            `}
                          >
                            <div className="flex flex-col justify-between h-full min-w-0">
                              <div className="flex flex-col min-w-0">
                                <div className={`font-semibold text-[10px] leading-tight h-3.5 flex items-center gap-0.5 truncate mb-0.5 ${isCancelled ? 'line-through text-gray-500' : ''}`}>
                                  <span className="truncate">{apt.client.firstName} {apt.client.lastName}</span>
                                  {isBirthdayThisMonth(apt.client.birthday) && (
                                    <PartyPopper className="h-2.5 w-2.5 text-pink-500 flex-shrink-0" />
                                  )}
                                </div>
                                <div className={`text-[9px] leading-tight h-3 flex items-center truncate min-w-0 ${isCancelled ? 'line-through text-gray-400' : 'opacity-75'}`}>
                                  {formatTime(apt.startAt)} - {formatTime(apt.endAt)}
                                </div>
                              </div>
                              <div className="mt-auto pt-1 flex-shrink-0">
                                {!isCancelled && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-[8px] px-1 py-0 h-3.5 font-medium border-gray-400 bg-white/90 w-full flex items-center justify-center rounded leading-none"
                                  >
                                    {apt.status}
                                  </Badge>
                                )}
                                {isCancelled && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-[8px] px-1 py-0 h-3.5 font-medium border-gray-400 bg-gray-100 w-full flex items-center justify-center rounded leading-none"
                                  >
                                    CANCELLED
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })()}

          {view === 'month' && (() => {
            const monthStart = startOfMonth(currentDate)
            const monthEnd = endOfMonth(currentDate)
            const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
            const firstDayOfMonth = getDay(monthStart)
            const daysBeforeMonth = Array.from({ length: firstDayOfMonth }, (_, i) => 
              addDays(monthStart, -firstDayOfMonth + i)
            )
            const allDays = [...daysBeforeMonth, ...monthDays]
            const weeks = []
            for (let i = 0; i < allDays.length; i += 7) {
              weeks.push(allDays.slice(i, i + 7))
            }
            
            const getAppointmentsForDay = (day: Date) => {
              return filteredAppointments.filter((apt) => 
                isSameDay(new Date(apt.startAt), day)
              )
            }
            
            return (
              <Card className="overflow-hidden flex-1 flex flex-col shadow-sm border-gray-200">
                <div className="grid grid-cols-7 border-b border-gray-200 flex-shrink-0 bg-white">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-1 text-center text-xs font-medium text-gray-500 border-r last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto">
                  {allDays.map((day, idx) => {
                    const dayAppointments = getAppointmentsForDay(day)
                    const isCurrentMonth = isSameMonth(day, currentDate)
                    const isCurrentDay = isToday(day)
                    
                    return (
                      <div
                        key={day.toISOString()}
                        onDoubleClick={(e) => {
                          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.appointment-card') === null) {
                            setCreateDate(day)
                            setCreateHour(undefined)
                            setIsCreateDialogOpen(true)
                          }
                        }}
                        onClick={(e) => {
                          // Single click selects the day
                          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.appointment-card') === null) {
                            setSelectedDay(day)
                          }
                        }}
                        className={`
                          min-h-[60px] p-1 border-r border-b cursor-pointer hover:bg-gray-50/50 transition-colors relative group
                          ${idx % 7 === 6 ? 'border-r-0' : ''}
                          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                          ${isCurrentDay ? 'bg-pink-50 border-pink-300' : ''}
                        `}
                      >
                        <div className={`
                          text-xs font-medium mb-0.5 inline-flex items-center justify-center rounded-full w-5 h-5
                          ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                          ${isCurrentDay ? 'bg-pink-600 text-white font-bold' : ''}
                        `}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-0.5">
                          {dayAppointments.slice(0, 2).map((apt) => {
                            const service = apt.appointmentServices?.[0]?.service
                            const color = service?.colorTag || 'blue'
                            const status = apt.status
                            const isCancelled = status === 'CANCELLED'
                            
                            return (
                              <div
                                key={apt.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedAppointment(apt)
                                  setIsDialogOpen(true)
                                }}
                                className={`
                                  appointment-card text-[10px] p-0.5 rounded cursor-pointer hover:shadow-sm transition-shadow truncate
                                  ${isCancelled ? 'bg-gray-100 border-gray-300 line-through text-gray-500' : statusColors[status] || colorMap[color] || colorMap.blue}
                                `}
                                title={`${apt.client.firstName} ${apt.client.lastName} - ${service?.name || 'Service'}`}
                              >
                                <div className="font-medium truncate flex items-center gap-1">
                                  {formatTime(apt.startAt)} {apt.client.firstName}
                                  {isBirthdayThisMonth(apt.client.birthday) && (
                                    <PartyPopper className="h-2.5 w-2.5 text-pink-500 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {dayAppointments.length > 2 && (
                            <div 
                              className="text-[9px] text-gray-500 font-medium cursor-pointer hover:text-gray-700 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDay(day)
                              }}
                            >
                              +{dayAppointments.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })()}
        </TabsContent>
      </Tabs>

      {/* Right Sidebar - Shows appointments for selected day */}
      {selectedDay && (
        <Card className="w-64 flex-shrink-0 flex flex-col border-l border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <h3 className="font-semibold text-sm">
              {format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedDay(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Appointments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Appointments</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => {
                    setCreateDate(selectedDay)
                    setCreateHour(undefined)
                    setIsCreateDialogOpen(true)
                  }}
                >
                  <Plus className="h-3 w-3 mr-0.5" /> Add
                </Button>
              </div>
              {selectedDayAppointments.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No appointments
                </div>
              ) : (
                <div className="space-y-2">
                {selectedDayAppointments.map((apt) => {
                  const service = apt.appointmentServices?.[0]?.service
                  const color = service?.colorTag || 'blue'
                  const status = apt.status
                  const isCancelled = status === 'CANCELLED'
                  
                  // Calculate payment status
                  const totalPrice = Number(apt.totalPrice || 0)
                  const balanceDue = invoiceBalanceDue(totalPrice, apt.payments)
                  const isPaid = balanceDue <= 0.01 && totalPrice > 0
                  const hasPayment = totalPrice > 0 // Only show payment status if there's a price
                  
                  return (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setSelectedAppointment(apt)
                        setIsDialogOpen(true)
                      }}
                      className={`
                        p-3 rounded-xl border-2 cursor-pointer hover:shadow-md transition-shadow overflow-hidden
                        ${isCancelled ? 'bg-gray-50 border-gray-300' : statusColors[status] || colorMap[color] || colorMap.blue}
                      `}
                    >
                      <div className="flex gap-3">
                        <div className="flex min-w-0 flex-1 gap-2.5">
                          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white/80 shadow-sm">
                            <AvatarFallback
                              className={`text-xs font-semibold ${
                                isCancelled ? 'bg-gray-200 text-gray-600' : 'bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800'
                              }`}
                            >
                              {getInitials(apt.client.firstName, apt.client.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div
                              className={`font-semibold text-sm leading-tight ${isCancelled ? 'line-through text-gray-500' : 'text-gray-900'}`}
                            >
                              <span className="break-words">
                                {apt.client.firstName} {apt.client.lastName}
                              </span>
                              {isBirthdayThisMonth(apt.client.birthday) && (
                                <PartyPopper className="h-3.5 w-3.5 text-pink-500 inline-block ml-1 align-middle" />
                              )}
                            </div>
                            <div
                              className={`text-xs font-medium ${isCancelled ? 'line-through text-gray-400' : 'text-gray-800'}`}
                            >
                              {format(new Date(apt.startAt), 'EEEE, MMMM d, yyyy')}
                            </div>
                            <div
                              className={`text-xs flex items-center gap-1 ${isCancelled ? 'line-through text-gray-400' : 'text-gray-600'}`}
                            >
                              <Clock className="h-3 w-3 shrink-0 text-gray-400" />
                              {formatTime(apt.startAt)}
                            </div>
                            <p
                              className={`text-xs leading-snug line-clamp-2 pt-0.5 ${isCancelled ? 'line-through text-gray-400' : 'text-gray-600'}`}
                            >
                              {service?.name || 'Consultation'}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2 self-start pt-0.5">
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-gray-600 hover:bg-white/60 hover:text-gray-900"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAppointment(apt)
                                setIsDialogOpen(true)
                              }}
                              aria-label="Edit appointment"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-gray-600 hover:bg-red-50 hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="Delete appointment"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this appointment.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      try {
                                        await deleteAppointment(apt.id)
                                        router.refresh()
                                      } catch {
                                        toast({
                                          title: 'Error',
                                          description: 'Failed to delete appointment',
                                          variant: 'destructive',
                                        })
                                      }
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <Badge
                            variant={isCancelled ? 'secondary' : 'outline'}
                            className={`text-[10px] font-semibold ${statusBadgeClass[status] || ''}`}
                          >
                            {formatAppointmentStatusLabel(apt.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {hasPayment && !isCancelled && (
                          <Badge
                            variant={isPaid ? 'default' : 'secondary'}
                            className={`text-[10px] px-1.5 py-0 h-5 whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${
                              isPaid
                                ? 'bg-green-600 text-white border-0'
                                : 'bg-orange-100 text-orange-700 border-orange-300'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPaymentAppointment(apt)
                              setIsPaymentDialogOpen(true)
                            }}
                          >
                            {isPaid ? 'Paid' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <div className={`shrink-0 ${isCancelled ? 'line-through text-gray-400' : 'text-muted-foreground'}`}>
                          {formatTime(apt.startAt)} – {formatTime(apt.endAt)}
                        </div>
                        <div className={`font-medium shrink-0 tabular-nums ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                          {formatCurrency(apt.totalPrice || 0)}
                        </div>
                      </div>
                      {apt.notes && (
                        <div className="mt-2 text-xs text-muted-foreground italic line-clamp-2 border-t border-black/5 pt-2">
                          {apt.notes}
                        </div>
                      )}
                    </div>
                  )
                })}
                </div>
              )}
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tasks</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => {
                    setCreateDate(selectedDay)
                    setIsTaskDialogOpen(true)
                  }}
                >
                  <Plus className="h-3 w-3 mr-0.5" /> Add
                </Button>
              </div>
              {selectedDayTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No tasks
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-start gap-2"
                    >
                      <button
                        onClick={async () => {
                          try {
                            await toggleTaskComplete(t.id)
                            router.refresh()
                          } catch {
                            toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' })
                          }
                        }}
                        className="mt-0.5 flex-shrink-0"
                      >
                        <CheckSquare className={`h-4 w-4 ${t.isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`flex flex-wrap items-center gap-1.5 text-sm font-medium ${t.isCompleted ? 'line-through text-gray-500' : ''}`}>
                          <span className="min-w-0">{t.title}</span>
                          {t.actionType && t.actionType !== 'task' ? (
                            <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-normal capitalize">
                              {String(t.actionType)}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatTime(t.dueAt)}</div>
                        {(t.appointmentId || t.appointment) && (
                          <button
                            type="button"
                            className="mt-0.5 block max-w-full truncate text-left text-xs text-pink-700 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              const id = t.appointment?.id ?? t.appointmentId
                              if (id) openAppointmentById(id)
                            }}
                          >
                            {t.appointment
                              ? formatTaskAppointmentPickLabel({
                                  id: t.appointment.id,
                                  startAt: t.appointment.startAt,
                                  client: t.appointment.client,
                                })
                              : 'Linked appointment'}
                          </button>
                        )}
                        {t.notes && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.notes}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-gray-700"
                          onClick={() => {
                            setEditingTask(t)
                            setIsEditTaskOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete task?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete “{t.title}”.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  try {
                                    await deleteTask(t.id)
                                    router.refresh()
                                  } catch {
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to delete task',
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reminders */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reminders</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => {
                    setCreateDate(selectedDay)
                    setIsReminderDialogOpen(true)
                  }}
                >
                  <Plus className="h-3 w-3 mr-0.5" /> Add
                </Button>
              </div>
              {selectedDayReminders.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No reminders
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayReminders.map((r) => (
                    <div
                      key={r.id}
                      className={`p-2 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start gap-2 ${
                        r.isCompleted ? 'opacity-70' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await toggleReminderComplete(r.id)
                            router.refresh()
                          } catch {
                            toast({ title: 'Error', description: 'Failed to update reminder', variant: 'destructive' })
                          }
                        }}
                        className="mt-0.5 flex-shrink-0"
                        aria-label={r.isCompleted ? 'Mark reminder incomplete' : 'Mark reminder complete'}
                      >
                        <CheckSquare
                          className={`h-4 w-4 ${r.isCompleted ? 'text-green-600' : 'text-amber-600'}`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`flex flex-wrap items-center gap-1.5 text-sm font-medium ${
                            r.isCompleted ? 'line-through text-gray-500' : ''
                          }`}
                        >
                          <span className="min-w-0">{r.title}</span>
                          {r.actionType && r.actionType !== 'task' ? (
                            <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-normal capitalize">
                              {String(r.actionType)}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatTime(r.dueAt)}</div>
                        {(r.appointmentId || r.appointment) && (
                          <button
                            type="button"
                            className="mt-0.5 block max-w-full truncate text-left text-xs text-amber-800 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              const id = r.appointment?.id ?? r.appointmentId
                              if (id) openAppointmentById(id)
                            }}
                          >
                            {r.appointment
                              ? formatTaskAppointmentPickLabel({
                                  id: r.appointment.id,
                                  startAt: r.appointment.startAt,
                                  client: r.appointment.client,
                                })
                              : 'Linked appointment'}
                          </button>
                        )}
                        {r.notes ? <div className="mt-0.5 line-clamp-2 text-xs text-gray-500">{r.notes}</div> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-gray-700"
                          onClick={() => {
                            setEditingReminder(r)
                            setIsEditReminderOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete “{r.title}”.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  try {
                                    await deleteReminder(r.id)
                                    router.refresh()
                                  } catch {
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to delete reminder',
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      </div>

      {isDialogOpen && (
        <AppointmentDialog
          appointment={selectedAppointment}
          services={services}
          clients={clients}
          staff={staff}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}

      <CreateAppointmentDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
            if (!open) {
              setCreateDate(undefined)
              setCreateHour(undefined)
              setCreateMinute(undefined)
            }
        }}
        services={services}
        clients={clients}
        staff={staff}
        initialDate={createDate}
        initialHour={createHour}
        initialMinute={createMinute}
      />

      <AddTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        initialDate={createDate}
        initialHour={createHour}
        initialMinute={createMinute}
        staffOptions={staff}
        clients={clients}
        appointments={appointmentLinkOptions}
        initialAppointmentId={initialAppointmentId ?? null}
      />

      <AddReminderDialog
        open={isReminderDialogOpen}
        onOpenChange={setIsReminderDialogOpen}
        initialDate={createDate}
        initialHour={createHour}
        initialMinute={createMinute}
        staffOptions={staff}
        clients={clients}
        appointments={appointmentLinkOptions}
        initialAppointmentId={initialAppointmentId ?? null}
      />

      <EditTaskDialog
        open={isEditTaskOpen}
        onOpenChange={setIsEditTaskOpen}
        task={editingTask}
        appointments={appointmentLinkOptions}
        onViewAppointment={openAppointmentById}
      />

      <EditReminderDialog
        open={isEditReminderOpen}
        onOpenChange={setIsEditReminderOpen}
        reminder={editingReminder}
        appointments={appointmentLinkOptions}
        onViewAppointment={openAppointmentById}
      />

      <AppointmentArchive
        appointments={cancelledAppointments}
        services={services}
        clients={clients}
        staff={staff}
        open={isArchiveOpen}
        onOpenChange={setIsArchiveOpen}
      />

      {paymentAppointment && (
        <PaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          appointment={paymentAppointment}
          onPaymentAdded={() => {
            router.refresh()
            setPaymentAppointment(null)
          }}
        />
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
const MemoizedCalendarView = memo(CalendarView)
export { MemoizedCalendarView as default }
export { CalendarView }
