'use client'

import { useState, useEffect, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatTime, formatDate, formatDateTime, getInitials } from '@/lib/utils'
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Cake,
  TrendingUp,
  Users,
  Gift,
  Package,
  CheckSquare,
  Bell,
  Rocket,
  FolderKanban,
  Pencil,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { AppointmentDialog } from '@/components/appointment-dialog'
import { deleteAppointment } from '@/app/actions/appointments'
import { getClient } from '@/app/actions/clients'
import { getClientLoyaltyTransactions } from '@/app/actions/loyalty'
import { onSyncEvent } from '@/lib/sync-events'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
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
import { countsTowardRevenueTotal, isPendingPublicWebsiteBooking } from '@/lib/appointment-status'

function CardCountBadge({ count }: { count: number }) {
  return (
    <Badge
      variant="secondary"
      className="h-5 min-w-[1.25rem] shrink-0 justify-center px-1.5 text-[10px] font-semibold tabular-nums leading-none"
    >
      {count}
    </Badge>
  )
}

interface DashboardProps {
  todayAppointments: any[]
  upcomingAppointments: any[]
  todayIncome: number
  todayCompletedIncome?: number
  todayBirthdays: any[]
  topLoyalty: any[]
  strikeClients: any[]
  services: any[]
  clients: any[]
  staff: any[]
  lowStockItems: any[]
  upcomingTasks?: any[]
  upcomingReminders?: any[]
  recentProjects?: any[]
  projectCount?: number
  pendingBillsSummary?: { pendingBillsCount: number; totalPending: number }
}

function Dashboard({
  todayAppointments,
  upcomingAppointments,
  todayIncome,
  todayCompletedIncome = 0,
  todayBirthdays,
  topLoyalty,
  strikeClients,
  services,
  clients,
  staff,
  lowStockItems,
  upcomingTasks = [],
  upcomingReminders = [],
  recentProjects = [],
  projectCount = 0,
  pendingBillsSummary,
}: DashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false)
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false)
  const [selectedStrikeClient, setSelectedStrikeClient] = useState<any>(null)
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false)
  const [loadingStrikeClient, setLoadingStrikeClient] = useState(false)
  const [selectedLoyaltyClient, setSelectedLoyaltyClient] = useState<any>(null)
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<any[]>([])
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false)
  const [loadingLoyaltyClient, setLoadingLoyaltyClient] = useState(false)
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false)

  // Listen for sync events and refresh the page
  useEffect(() => {
    const handleSync = () => {
      router.refresh()
    }

    const cleanup1 = onSyncEvent('payment-recorded', handleSync)
    const cleanup2 = onSyncEvent('appointment-updated', handleSync)
    const cleanup3 = onSyncEvent('appointment-created', handleSync)
    const cleanup4 = onSyncEvent('client-updated', handleSync)
    const cleanup5 = onSyncEvent('project-created', handleSync)

    return () => {
      cleanup1()
      cleanup2()
      cleanup3()
      cleanup4()
      cleanup5()
    }
  }, [router])

  const upcoming = upcomingAppointments
    .filter((apt) => apt.status !== 'CANCELLED')
    .slice(0, 5)

  // Get all upcoming appointments for the week (not just first 5)
  const allUpcomingAppointments = upcomingAppointments
    .filter((apt) => apt.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  /** Week total: not raw BOOKED holds (website or internal) — only confirmed/ completed / no-show / etc. */
  const allUpcomingAppointmentsForStats = allUpcomingAppointments.filter(
    (apt) => apt.status !== 'BOOKED'
  )
  const todayAppointmentsForIncomeCard = todayAppointments.filter((apt) =>
    countsTowardRevenueTotal(apt)
  )

  const upcomingTaskItems = upcomingTasks.slice(0, 20)
  const upcomingReminderItems = upcomingReminders.slice(0, 20)

  const statusColors: Record<string, string> = {
    BOOKED: 'bg-purple-100 text-purple-700 border-purple-200',
    CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
    COMPLETED: 'bg-gray-100 text-gray-700 border-gray-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  }

  const formatAppointmentStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      BOOKED: 'Booked',
      CONFIRMED: 'Confirmed',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    }
    return map[status] || status.replace(/_/g, ' ')
  }

  return (
    <div className="flex h-full min-h-0 max-h-full flex-col gap-2 overflow-hidden sm:gap-2">
      {/* Stats Overview - Clean Solid Color Cards */}
      <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer bg-white border-pink-200 hover:shadow-md transition-all duration-200"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsIncomeModalOpen(true)
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 gap-1.5 sm:p-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <CardTitle className="text-xs font-medium text-gray-700 truncate">Today&apos;s Income</CardTitle>
              <CardCountBadge count={todayAppointmentsForIncomeCard.length} />
            </div>
            <DollarSign className="h-4 w-4 text-pink-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-2.5">
            <div className="text-lg font-bold text-pink-600 sm:text-xl">{formatCurrency(todayIncome)}</div>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
              {todayAppointmentsForIncomeCard.length} confirmed or completed today
              {todayCompletedIncome > 0 && todayCompletedIncome !== todayIncome && (
                <span className="block mt-0.5">({formatCurrency(todayCompletedIncome)} completed)</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-white border-purple-200 transition-all duration-200 cursor-pointer hover:shadow-md"
          onClick={() => setIsBirthdayModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 gap-1.5 sm:p-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <CardTitle className="text-xs font-medium text-gray-700 truncate">Birthdays This Month</CardTitle>
              <CardCountBadge count={todayBirthdays.length} />
            </div>
            <Cake className="h-4 w-4 text-purple-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-2.5">
            <div className="text-lg font-bold text-purple-600 sm:text-xl">{todayBirthdays.length}</div>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
              {todayBirthdays.length === 1 ? 'Client birthday' : 'Client birthdays'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer bg-white border-orange-200 hover:shadow-md transition-all duration-200"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsLowStockModalOpen(true)
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 gap-1.5 sm:p-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <CardTitle className="text-xs font-medium text-gray-700 truncate">Low Stock Items</CardTitle>
              <CardCountBadge count={lowStockItems.length} />
            </div>
            <Package className="h-4 w-4 text-orange-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-2.5">
            <div className={`text-lg font-bold sm:text-xl ${lowStockItems.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
              {lowStockItems.length}
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
              {lowStockItems.length === 1 ? 'Item needs restocking' : 'Items need restocking'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-white border-cyan-200 cursor-pointer hover:shadow-md transition-all duration-200"
          onClick={() => setIsAppointmentsModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 gap-1.5 sm:p-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <CardTitle className="text-xs font-medium text-gray-700 truncate">Total Appointments</CardTitle>
              <CardCountBadge count={allUpcomingAppointmentsForStats.length} />
            </div>
            <Calendar className="h-4 w-4 text-cyan-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-2.5">
            <div className="text-lg font-bold text-cyan-600 sm:text-xl">{allUpcomingAppointmentsForStats.length}</div>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">Upcoming this week (excludes unconfirmed bookings)</p>
          </CardContent>
        </Card>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex flex-col gap-2">
      <div className="grid gap-2 lg:grid-cols-3 lg:items-stretch">
        {/* Upcoming Appointments */}
        <Card className="flex max-h-[min(220px,34vh)] min-h-0 flex-col overflow-hidden border-gray-200 shadow-sm lg:max-h-[min(260px,38vh)]">
          <CardHeader className="flex-shrink-0 p-2 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 min-w-0">
                <TrendingUp className="h-4 w-4 text-pink-600 shrink-0" />
                <span className="truncate">Upcoming Appointments</span>
              </CardTitle>
              <CardCountBadge count={allUpcomingAppointmentsForStats.length} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto p-2 pt-1.5">
            {upcoming.length === 0 ? (
              <p className="text-xs text-gray-500">No upcoming appointments</p>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => {
                      setSelectedAppointment(apt)
                      setIsDialogOpen(true)
                    }}
                    className="flex gap-2 rounded-lg border border-gray-200 bg-white p-2 transition-all hover:border-gray-300 hover:bg-gray-50/80 hover:shadow-sm cursor-pointer"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Avatar className="h-8 w-8 shrink-0 ring-1 ring-pink-100">
                        <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-[10px] font-semibold text-pink-800">
                          {getInitials(apt.client.firstName, apt.client.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold leading-tight text-gray-900">
                          {apt.client.firstName} {apt.client.lastName}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-600">
                          {format(new Date(apt.startAt), 'EEE, MMM d, yyyy')}
                        </div>
                        <div className="text-[11px] text-gray-600">
                          {format(new Date(apt.startAt), 'h:mm a')}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">
                          {apt.appointmentServices?.[0]?.service?.name || 'Consultation'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 self-start">
                      <div className="flex items-center gap-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAppointment(apt)
                            setIsDialogOpen(true)
                          }}
                          aria-label="Edit appointment"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md text-gray-500 hover:bg-red-50 hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Delete appointment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
                        variant="outline"
                        className={`px-1.5 py-0 text-[9px] font-semibold ${statusColors[apt.status] || ''}`}
                      >
                        {formatAppointmentStatusLabel(apt.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="flex max-h-[min(220px,34vh)] min-h-0 flex-col overflow-hidden border-gray-200 shadow-sm lg:max-h-[min(260px,38vh)]">
          <CardHeader className="flex-shrink-0 p-2 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 min-w-0">
                <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="truncate">Upcoming Tasks</span>
              </CardTitle>
              <CardCountBadge count={upcomingTasks.length} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2 pt-1.5 min-h-0 overflow-y-auto overscroll-contain">
            {upcomingTaskItems.length === 0 ? (
              <p className="text-xs text-gray-500">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {upcomingTaskItems.map((task: any) => (
                  <Link
                    key={task.id}
                    href={`/app/calendar?date=${format(new Date(task.dueAt), 'yyyy-MM-dd')}`}
                    className="block p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all"
                  >
                    <div className="text-xs font-medium text-gray-800 line-clamp-1">{task.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{format(new Date(task.dueAt), 'MMM d, h:mm a')}</div>
                    {task.notes && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{task.notes}</div>}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card className="flex max-h-[min(220px,34vh)] min-h-0 flex-col overflow-hidden border-gray-200 shadow-sm lg:max-h-[min(260px,38vh)]">
          <CardHeader className="flex-shrink-0 p-2 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 min-w-0">
                <Bell className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="truncate">Reminders</span>
              </CardTitle>
              <CardCountBadge count={upcomingReminders.length} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2 pt-1.5 min-h-0 overflow-y-auto overscroll-contain">
            {upcomingReminderItems.length === 0 ? (
              <p className="text-xs text-gray-500">No reminders</p>
            ) : (
              <div className="space-y-2">
                {upcomingReminderItems.map((reminder: any) => (
                  <Link
                    key={reminder.id}
                    href={`/app/calendar?date=${format(new Date(reminder.dueAt), 'yyyy-MM-dd')}`}
                    className="block p-2 rounded-lg border border-amber-200 bg-amber-50/30 hover:bg-amber-50 hover:shadow-sm transition-all"
                  >
                    <div className="text-xs font-medium text-gray-800 line-clamp-1">{reminder.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{format(new Date(reminder.dueAt), 'MMM d, h:mm a')}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loyalty / strikes / projects */}
      <div className="grid gap-3 lg:grid-cols-3 lg:items-stretch">
        {/* Top Loyalty Customers */}
        <Card className="flex max-h-[min(260px,36vh)] min-h-0 flex-col overflow-hidden border-gray-200 shadow-sm lg:max-h-[min(300px,40vh)]">
          <CardHeader className="flex-shrink-0 p-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800 min-w-0">
                <Gift className="h-5 w-5 text-yellow-600 shrink-0" />
                <span className="truncate">Top Loyalty Customers</span>
              </CardTitle>
              <CardCountBadge count={topLoyalty.length} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 pt-2">
            {topLoyalty.length === 0 ? (
              <p className="text-sm text-gray-500">No loyalty customers yet</p>
            ) : (
              <div className="space-y-2">
                {topLoyalty.map((account, index) => {
                  const isTopThree = index < 3
                  const rankColors = [
                    { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', border: 'border-yellow-400', text: 'text-yellow-900', ring: 'ring-yellow-300', medal: '🥇' },
                    { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', border: 'border-gray-400', text: 'text-gray-900', ring: 'ring-gray-300', medal: '🥈' },
                    { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', border: 'border-orange-400', text: 'text-orange-900', ring: 'ring-orange-300', medal: '🥉' },
                  ]
                  const rankColor = isTopThree && rankColors[index] ? rankColors[index] : null

                  return (
                    <div
                      key={account.id}
                      onClick={() => {
                        setLoadingLoyaltyClient(true)
                        Promise.all([
                          getClient(account.clientId),
                          getClientLoyaltyTransactions(account.clientId)
                        ])
                          .then(([client, transactions]) => {
                            setSelectedLoyaltyClient(client)
                            setLoyaltyTransactions(transactions)
                            setIsLoyaltyModalOpen(true)
                          })
                          .catch((error) => {
                            console.error('Failed to load client loyalty data:', error)
                          })
                          .finally(() => {
                            setLoadingLoyaltyClient(false)
                          })
                      }}
                      className={`group relative overflow-hidden flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer w-full ${
                        isTopThree && rankColor
                          ? `${rankColor.border} ${rankColor.bg} ${rankColor.text} shadow-sm hover:shadow-md`
                          : 'border-gray-200 hover:bg-gray-50 bg-white'
                      }`}
                    >
                      {/* Animated confetti for top 3 */}
                      {isTopThree && (
                        <>
                          <div className="absolute top-0 left-0 text-sm animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.5s' }}>🎉</div>
                          <div className="absolute top-0 right-0 text-xs animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '1.7s' }}>✨</div>
                          <div className="absolute bottom-0 left-0 text-xs animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '1.4s' }}>🎊</div>
                          <div className="absolute bottom-0 right-0 text-xs animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '1.6s' }}>⭐</div>
                          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs animate-pulse" style={{ animationDelay: '0.2s' }}>💫</div>
                          <div className="absolute top-1 left-1/4 text-xs animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.3s' }}>🌟</div>
                          <div className="absolute top-1 right-1/4 text-xs animate-bounce" style={{ animationDelay: '0.7s', animationDuration: '1.5s' }}>🎈</div>
                        </>
                      )}

                      {/* Rank Badge */}
                      <div className="flex-shrink-0 relative z-10">
                        {isTopThree && rankColor ? (
                          <div className={`w-8 h-8 rounded-full ${rankColor.bg} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                            {rankColor.medal}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-xs">
                            #{index + 1}
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="relative z-10">
                        <Avatar className={`h-10 w-10 ${isTopThree && rankColor ? `ring-2 ${rankColor.ring} ring-4 shadow-md` : 'ring-2 ring-white shadow-sm'}`}>
                          <AvatarFallback className={`text-xs ${isTopThree && rankColor ? rankColor.bg + ' text-white font-bold' : 'font-semibold'}`}>
                            {getInitials(account.client.firstName, account.client.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Client Info */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className={`font-medium text-sm truncate ${isTopThree ? 'font-bold' : 'font-semibold'}`}>
                          {account.client.firstName} {account.client.lastName}
                        </div>
                        <div className={`text-xs truncate ${isTopThree ? 'opacity-90' : 'text-muted-foreground'}`}>
                          {account.client.phone || 'No phone'}
                        </div>
                      </div>

                      {/* Points */}
                      <div className={`flex flex-col items-end relative z-10 ${isTopThree ? 'text-white' : ''}`}>
                        <div className={`flex items-center gap-1 text-base font-bold ${isTopThree ? 'text-white' : 'text-primary'}`}>
                          <Sparkles className={`h-4 w-4 ${isTopThree ? 'animate-pulse' : ''}`} />
                          {account.pointsBalance}
                        </div>
                        {!isTopThree && <div className="text-xs text-muted-foreground">points</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients with Strikes */}
        <Card className="flex max-h-[min(260px,36vh)] min-h-0 flex-col overflow-hidden border-gray-200 shadow-sm lg:max-h-[min(300px,40vh)]">
          <CardHeader className="flex-shrink-0 p-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800 min-w-0">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <span className="truncate">Clients with Strikes</span>
              </CardTitle>
              <CardCountBadge count={strikeClients.length} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 pt-2">
            {strikeClients.length === 0 ? (
              <p className="text-sm text-gray-500">No clients with strikes</p>
            ) : (
              <div className="space-y-2">
                {strikeClients.map((item: any) => (
                  <div
                    key={item.client.id}
                    onClick={() => {
                      setLoadingStrikeClient(true)
                      getClient(item.client.id)
                        .then((client) => {
                          setSelectedStrikeClient(client)
                          setIsStrikeModalOpen(true)
                        })
                        .catch((error) => {
                          console.error('Failed to load client strikes:', error)
                        })
                        .finally(() => {
                          setLoadingStrikeClient(false)
                        })
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <Avatar className="h-9 w-9 ring-2 ring-red-200">
                      <AvatarFallback className="text-xs bg-red-100 text-red-700">
                        {getInitials(item.client.firstName, item.client.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800">
                        {item.client.firstName} {item.client.lastName}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {item.client.phone || item.client.email || 'No contact'}
                      </div>
                    </div>
                    <Badge variant="destructive" className="font-bold">
                      {item.totalStrikes}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects pipeline */}
        <Card className="flex max-h-[min(260px,36vh)] min-h-0 flex-col overflow-hidden border-gray-200 shadow-sm lg:max-h-[min(300px,40vh)]">
          <CardHeader className="flex-shrink-0 p-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800 min-w-0">
                <FolderKanban className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="truncate">Projects</span>
              </CardTitle>
              <div className="flex items-center gap-2 shrink-0">
                <CardCountBadge count={projectCount} />
                <Link
                  href="/app/projects"
                  className="text-xs font-medium text-pink-600 hover:text-pink-700 whitespace-nowrap"
                >
                  Open pipeline
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-3 pt-2 min-h-0 overflow-y-auto overscroll-contain">
            {recentProjects.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-500">No projects yet</p>
                <Link
                  href="/app/projects"
                  className="text-sm font-medium text-pink-600 hover:text-pink-700"
                >
                  Go to Projects →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((project: any) => (
                  <Link
                    key={project.id}
                    href="/app/projects"
                    className="block p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:shadow-sm transition-all"
                  >
                    <div className="text-sm font-medium text-gray-800 line-clamp-1">{project.title}</div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-gray-600">{project.stage?.name ?? '—'}</span>
                      {project.clientName && (
                        <span className="text-xs text-gray-500 truncate max-w-[50%]">{project.clientName}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming soon — single compact strip (replaces three tall placeholder cards) */}
      <Card className="shrink-0 border border-dashed border-gray-200 bg-gray-50/50 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 p-2.5 sm:p-3">
          <Rocket className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="text-sm text-gray-600">More features on the way</span>
        </CardContent>
      </Card>

        </div>
      </div>

      {/* Appointment Dialog */}
      {isDialogOpen && selectedAppointment && (
        <AppointmentDialog
          appointment={selectedAppointment}
          services={services}
          clients={clients}
          staff={staff}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}

      {/* Birthdays Modal */}
      <Dialog open={isBirthdayModalOpen} onOpenChange={setIsBirthdayModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-600" />
              Birthdays This Month 🎉
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {todayBirthdays.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No birthdays this month</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {todayBirthdays.map((client) => (
                  <Link
                    key={client.id}
                    href={`/app/clients/${client.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-pink-200 bg-white hover:bg-pink-50 transition-colors"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-pink-200">
                      <AvatarFallback className="text-sm bg-pink-100 text-pink-700">
                        {getInitials(client.firstName, client.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800">
                        {client.firstName} {client.lastName}
                      </div>
                      <div className="text-xs text-gray-600">
                        🎂 {format(new Date(client.birthday), 'MMMM d')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Today's Income Modal */}
      <Dialog open={isIncomeModalOpen} onOpenChange={setIsIncomeModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-pink-600" />
              Today&apos;s Income Details
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {(() => {
              const allTodayAppointments = todayAppointments.filter((a) => a.status !== 'CANCELLED')
              const countedTodayAppointments = allTodayAppointments.filter((a) =>
                countsTowardRevenueTotal(a)
              )
              const pendingTodayAppointments = allTodayAppointments.filter((a) => isPendingPublicWebsiteBooking(a))
              const unconfirmedBookedToday = allTodayAppointments.filter(
                (a) => a.status === 'BOOKED' && !isPendingPublicWebsiteBooking(a)
              )
              const totalIncome = countedTodayAppointments.reduce(
                (sum, apt) => sum + Number(apt.totalPrice || 0),
                0
              )
              const completedAppointments = todayAppointments.filter((a) => a.status === 'COMPLETED')
              const completedIncome = completedAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0)
              
              if (allTodayAppointments.length === 0) {
                return (
                  <p className="text-gray-500 text-center py-8">No appointments scheduled for today</p>
                )
              }

              return (
                <div className="space-y-4">
                  {/* Total Summary */}
                  <Card className="bg-white border-2 border-pink-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Recognized revenue (confirmed or completed)</p>
                          <p className="text-3xl font-bold text-pink-600 mt-1">{formatCurrency(totalIncome)}</p>
                          {pendingTodayAppointments.length > 0 && (
                            <p className="text-xs text-amber-700 mt-2">
                              {pendingTodayAppointments.length} website booking
                              {pendingTodayAppointments.length !== 1 ? 's' : ''} awaiting approval (not included)
                            </p>
                          )}
                          {unconfirmedBookedToday.length > 0 && (
                            <p className="text-xs text-slate-600 mt-2">
                              {unconfirmedBookedToday.length} unconfirmed booking
                              {unconfirmedBookedToday.length !== 1 ? 's' : ''} (not included until confirmed)
                            </p>
                          )}
                        </div>
                        <div className="p-4 rounded-full bg-pink-100">
                          <DollarSign className="h-8 w-8 text-pink-600" />
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-gray-600">
                          {countedTodayAppointments.length} appointment
                          {countedTodayAppointments.length !== 1 ? 's' : ''} counted toward income
                        </p>
                        {completedIncome > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            {formatCurrency(completedIncome)} completed ({completedAppointments.length} appointment{completedAppointments.length !== 1 ? 's' : ''})
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Appointment List */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700">Today&apos;s Appointments</h3>
                    {allTodayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => {
                          setSelectedAppointment(apt)
                          setIsIncomeModalOpen(false)
                          setIsDialogOpen(true)
                        }}
                        className="flex items-center gap-4 p-4 rounded-lg border border-pink-200 bg-white hover:bg-pink-50 transition-all cursor-pointer"
                      >
                        <Avatar className="h-10 w-10 ring-2 ring-pink-200">
                          <AvatarFallback className="text-sm bg-pink-100 text-pink-700">
                            {getInitials(apt.client.firstName, apt.client.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800">
                            {apt.client.firstName} {apt.client.lastName}
                          </div>
                          <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(apt.startAt)} - {formatTime(apt.endAt)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {apt.appointmentServices?.[0]?.service?.name || 'Service'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              countsTowardRevenueTotal(apt) ? 'text-pink-600' : 'text-gray-400'
                            }`}
                          >
                            {formatCurrency(Number(apt.totalPrice || 0))}
                          </div>
                          {!countsTowardRevenueTotal(apt) && (
                            <p className="text-[10px] text-amber-800 mt-1 max-w-[140px] ml-auto leading-tight">
                              Not included until confirmed or completed
                            </p>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`mt-1 ${
                              apt.status === 'COMPLETED' 
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : apt.status === 'CONFIRMED'
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : apt.status === 'BOOKED'
                                ? 'border-purple-200 bg-purple-50 text-purple-700'
                                : 'border-gray-200 bg-gray-50 text-gray-700'
                            }`}
                          >
                            {formatAppointmentStatusLabel(apt.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Low stock items */}
      <Dialog open={isLowStockModalOpen} onOpenChange={setIsLowStockModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Low stock items
              <Badge variant="secondary" className="ml-1 font-semibold tabular-nums">
                {lowStockItems.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            {lowStockItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing is below its minimum right now. You are fully stocked.
              </p>
            ) : (
              <ul className="space-y-2">
                {lowStockItems.map((item: any) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                        {(item.category || item.inventoryCategory?.name) && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.inventoryCategory?.name || item.category}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-orange-200 bg-white text-orange-800 tabular-nums"
                      >
                        {item.quantity} / {item.minQuantity} {item.unit || 'units'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t pt-3">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/app/inventory?filter=lowStock" onClick={() => setIsLowStockModalOpen(false)}>
                  Open inventory
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Strike History Modal */}
      <Dialog open={isStrikeModalOpen} onOpenChange={setIsStrikeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Strike History
              {selectedStrikeClient && (
                <span className="text-sm font-normal text-gray-500">
                  - {selectedStrikeClient.firstName} {selectedStrikeClient.lastName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingStrikeClient ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500 text-sm">Loading strike history...</p>
            </div>
          ) : selectedStrikeClient && selectedStrikeClient.strikeEvents ? (
            <div className="space-y-2">
              {selectedStrikeClient.strikeEvents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No strikes recorded for this client
                </p>
              ) : (
                selectedStrikeClient.strikeEvents.flatMap((strike: any) => {
                  // Expand strikes with delta > 1 into individual entries
                  const expandedStrikes = []
                  for (let i = 0; i < strike.delta; i++) {
                    expandedStrikes.push(
                      <div
                        key={`${strike.id}-${i}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0">
                            <Badge variant="destructive" className="text-xs font-semibold">
                              {strike.type === 'NO_SHOW' ? 'No Show' :
                               strike.type === 'LATE_CANCEL' ? 'Late Cancel' :
                               strike.type === 'MANUAL' ? 'Manual' : strike.type}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-800">
                              {formatDateTime(strike.createdAt)}
                            </div>
                            {strike.appointment && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Appointment: {formatDateTime(strike.appointment.startAt)}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs font-bold">+1</Badge>
                      </div>
                    )
                  }
                  return expandedStrikes
                })
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Loyalty Points History Modal */}
      <Dialog open={isLoyaltyModalOpen} onOpenChange={setIsLoyaltyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-yellow-600" />
              Points History
              {selectedLoyaltyClient && (
                <span className="text-sm font-normal text-gray-500">
                  - {selectedLoyaltyClient.firstName} {selectedLoyaltyClient.lastName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingLoyaltyClient ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500 text-sm">Loading points history...</p>
            </div>
          ) : selectedLoyaltyClient && loyaltyTransactions ? (
            <div className="space-y-2">
              {loyaltyTransactions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No points transactions recorded for this client
                </p>
              ) : (
                loyaltyTransactions.map((transaction: any) => {
                  const services = transaction.appointment?.appointmentServices?.map((as: any) => as.service.name).join(', ') || null
                  const isPositive = transaction.deltaPoints > 0
                  
                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        isPositive
                          ? 'border-green-200 bg-white hover:bg-green-50'
                          : 'border-red-200 bg-white hover:bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <Badge 
                            variant={isPositive ? "default" : "destructive"} 
                            className={`text-xs font-semibold ${
                              isPositive ? 'bg-green-600 hover:bg-green-700' : ''
                            }`}
                          >
                            {isPositive ? '+' : ''}{transaction.deltaPoints} pts
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">
                            {transaction.reason}
                          </div>
                          {services && (
                            <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                              {services}
                            </div>
                          )}
                          {transaction.appointment && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {formatDateTime(transaction.appointment.startAt)}
                            </div>
                          )}
                          {!transaction.appointment && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {formatDateTime(transaction.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* This Week's Appointments Modal */}
      <Dialog open={isAppointmentsModalOpen} onOpenChange={setIsAppointmentsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-600" />
              <span>
                This Week&apos;s Appointments (
                {allUpcomingAppointmentsForStats.length}
                {allUpcomingAppointments.length > allUpcomingAppointmentsForStats.length
                  ? ` + ${allUpcomingAppointments.length - allUpcomingAppointmentsForStats.length} unconfirmed`
                  : ''}
                )
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {allUpcomingAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming appointments this week</p>
            ) : (
              <div className="space-y-3">
                {allUpcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => {
                      setSelectedAppointment(apt)
                      setIsAppointmentsModalOpen(false)
                      setIsDialogOpen(true)
                    }}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-cyan-200">
                      <AvatarFallback className="text-sm bg-cyan-100 text-cyan-700">
                        {getInitials(apt.client.firstName, apt.client.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800">
                        {apt.client.firstName} {apt.client.lastName}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(apt.startAt), 'MMM d, h:mm a')} - {format(new Date(apt.endAt), 'h:mm a')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {apt.appointmentServices?.[0]?.service?.name || 'Service'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isPendingPublicWebsiteBooking(apt) && (
                        <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-900">
                          Website — awaiting approval
                        </Badge>
                      )}
                      {apt.status === 'BOOKED' && !isPendingPublicWebsiteBooking(apt) && (
                        <Badge variant="outline" className="text-[10px] border-slate-300 bg-slate-50 text-slate-800">
                          Unconfirmed
                        </Badge>
                      )}
                      <Badge variant="outline" className={statusColors[apt.status] || ''}>
                        {formatAppointmentStatusLabel(apt.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
const MemoizedDashboard = memo(Dashboard)
export default MemoizedDashboard
