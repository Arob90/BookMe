'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, formatDateTime, formatAddress, getClientDisplayName, getClientInitials, getClientCompanyName, getDaysUntilBirthday, generateClientId } from '@/lib/utils'
import { grossPaymentsTotal, invoiceBalanceDue } from '@/lib/payment-net'
import { Calendar, Phone, Mail, Gift, AlertTriangle, Clock, Edit, Trash2, MoreVertical, Sparkles, AlertCircle, CreditCard, UserCircle, Receipt, Users, MapPin } from 'lucide-react'
import { updateClient, deleteClient } from '@/app/actions/clients'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { EditClientDialog } from '@/components/edit-client-dialog'
import { AppointmentDialog } from '@/components/appointment-dialog'
import { onSyncEvent } from '@/lib/sync-events'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ClientProfileProps {
  client: any
  onClientUpdated?: () => void
  services?: any[]
  clients?: any[]
  staff?: any[]
}

export function ClientProfile({ client, onClientUpdated, services = [], clients = [], staff = [] }: ClientProfileProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentClient, setCurrentClient] = useState(client)
  
  // Update local client when prop changes
  useEffect(() => {
    setCurrentClient(client)
  }, [client])
  
  const daysUntilBirthday = getDaysUntilBirthday(currentClient.birthday)
  const strikeEvents = currentClient.strikeEvents || []
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(currentClient.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)

  // Listen for sync events and refresh client data
  useEffect(() => {
    const handlePaymentRecorded = async (event: CustomEvent) => {
      // Refresh client data if payment was for this client
      if (event.detail?.clientId === currentClient?.id || event.detail?.appointmentId) {
        router.refresh()
      }
    }

    const handleClientUpdated = () => {
      router.refresh()
    }

    const handleAppointmentUpdated = (event: CustomEvent) => {
      const appointmentId = event.detail?.appointmentId as string | undefined
      const status = event.detail?.status as string | undefined
      if (appointmentId && status) {
        setCurrentClient((prev: any) => {
          const next = { ...prev }
          const appts = Array.isArray(next.appointments) ? [...next.appointments] : []
          const idx = appts.findIndex((a: any) => a?.id === appointmentId)
          if (idx >= 0) {
            appts[idx] = { ...appts[idx], status }
            next.appointments = appts
          }
          return next
        })
      }
      router.refresh()
    }

    const cleanup1 = onSyncEvent('payment-recorded', handlePaymentRecorded)
    const cleanup2 = onSyncEvent('client-updated', handleClientUpdated)
    const cleanup3 = onSyncEvent('appointment-updated', handleAppointmentUpdated)

    return () => {
      cleanup1()
      cleanup2()
      cleanup3()
    }
  }, [router, currentClient?.id])

  // Update notes when client changes
  useEffect(() => {
    setNotes(currentClient.notes || '')
  }, [currentClient.notes])

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${getClientDisplayName(currentClient)}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteClient(currentClient.id)
      toast({
        title: 'Success',
        description: 'Client deleted successfully',
      })
      router.push('/app/clients')
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete client',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Generate consistent color for avatar based on name (same as client cards)
  const avatarColors = [
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
  ]
  const displayName = getClientDisplayName(currentClient)
  const colorIndex = displayName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length
  const avatarColor = avatarColors[colorIndex]
  const isBirthday = daysUntilBirthday !== null && daysUntilBirthday <= 7
  const hasPendingBills = currentClient.hasPendingBills || (currentClient.pendingBalance && currentClient.pendingBalance > 0)
  const pendingBalance = currentClient.pendingBalance || 0
  const pendingBillsCount = currentClient.pendingBillsCount || 0
  const loyaltyPoints = currentClient.loyaltyAccount?.pointsBalance || 0
  const isHighLoyalty = loyaltyPoints >= 500 // Consider 500+ points as high loyalty
  const isTopCustomer = (currentClient.lifetimeSpend || 0) >= 500 || (currentClient.totalVisits || 0) >= 10
  const displayClientId = generateClientId(
    currentClient.type === 'COMPANY' ? (currentClient.companyName || currentClient.firstName || '') : (currentClient.firstName || ''),
    currentClient.type === 'COMPANY' ? (currentClient.contactName || currentClient.lastName || '') : (currentClient.lastName || ''),
    currentClient.birthday,
    clients || [],
    currentClient.id,
    { type: currentClient.type, companyFoundedAt: currentClient.companyFoundedAt }
  )

  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
      {/* Header Card */}
      <Card className={`border-2 ${
        isBirthday 
          ? 'border-pink-400 bg-gradient-to-br from-pink-50/30 to-purple-50/30' 
          : hasPendingBills
          ? 'border-orange-400 bg-gradient-to-br from-orange-50/30 to-amber-50/30'
          : isHighLoyalty
          ? 'border-yellow-400 bg-gradient-to-br from-yellow-50/30 to-amber-50/30'
          : isTopCustomer
          ? 'border-pink-400 bg-gradient-to-br from-pink-50/30 to-purple-50/30'
          : 'border-gray-200 bg-white'
      }`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <Avatar className={`h-16 w-16 ring-2 ${
                isBirthday 
                  ? 'ring-pink-300 animate-pulse' 
                  : hasPendingBills
                  ? 'ring-orange-300'
                  : isHighLoyalty
                  ? 'ring-yellow-300'
                  : isTopCustomer
                  ? 'ring-pink-300'
                  : 'ring-gray-100'
              }`}>
                <AvatarFallback className={`text-lg font-bold ${
                  isBirthday 
                    ? 'bg-gradient-to-br from-pink-400 to-purple-500' 
                    : hasPendingBills
                    ? 'bg-gradient-to-br from-orange-400 to-amber-500'
                    : isHighLoyalty
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                    : isTopCustomer
                    ? 'bg-gradient-to-br from-pink-400 to-purple-500'
                    : avatarColor
                } text-white`}>
                  {getClientInitials(currentClient)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-xl font-bold text-gray-900">
                      {getClientDisplayName(currentClient)}
                    </h1>
                    {currentClient.type && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-1.5 py-0 border-gray-300 bg-gray-50 text-gray-700"
                      >
                        {currentClient.type === 'COMPANY' ? 'Company' : 'Individual'}
                      </Badge>
                    )}
                    {currentClient.type === 'INDIVIDUAL' && getClientCompanyName(currentClient) && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        at {getClientCompanyName(currentClient)}
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isDeleting ? 'Deleting...' : 'Delete Client'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-2">Client ID: {displayClientId}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {currentClient.tags?.includes('VIP') && (
                      <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-0 font-semibold text-xs px-1.5 py-0.5 h-5">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        VIP
                      </Badge>
                    )}
                    {isTopCustomer && !currentClient.tags?.includes('VIP') && (
                      <Badge variant="secondary" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 font-semibold text-xs px-1.5 py-0.5 h-5">
                        <Gift className="h-2.5 w-2.5 mr-0.5" />
                        Top Customer
                      </Badge>
                    )}
                    {isHighLoyalty && loyaltyPoints > 0 && (
                      <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 font-semibold text-xs px-1.5 py-0.5 h-5">
                        <Gift className="h-2.5 w-2.5 mr-0.5" />
                        Loyal ({loyaltyPoints})
                      </Badge>
                    )}
                    {isBirthday && (
                      <Badge variant="outline" className="border-pink-400 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 font-bold text-xs px-1.5 py-0.5 h-5 animate-pulse">
                        🎂 {daysUntilBirthday}d
                      </Badge>
                    )}
                    {hasPendingBills && (
                      <Badge variant="outline" className="border-orange-400 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 font-bold text-xs px-1.5 py-0.5 h-5">
                        <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                        Bill ({formatCurrency(pendingBalance)})
                      </Badge>
                    )}
                    {strikeEvents.length > 0 && (
                      <>
                        {strikeEvents.map((strike: any) => {
                          // Only show strike badge if delta is not 0
                          if (strike.delta === 0) return null
                          return (
                            <Badge key={strike.id} variant="destructive" className="font-semibold text-xs px-1.5 py-0.5 h-5">
                              {strike.type === 'NO_SHOW' ? 'No Show' : 
                               strike.type === 'LATE_CANCEL' ? 'Late' : 
                               strike.type === 'MANUAL' ? 'Manual' : 'Strike'} ({strike.delta})
                            </Badge>
                          )
                        })}
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-md bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200">
                      <Phone className="h-3.5 w-3.5 text-pink-700" />
                      <span className="text-xs font-medium text-gray-900 truncate">{currentClient.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                      <Mail className="h-3.5 w-3.5 text-green-700" />
                      <span className="text-xs font-medium text-gray-900 truncate">{currentClient.email || 'No email'}</span>
                    </div>
                    {formatAddress(currentClient) && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 border border-gray-200 sm:col-span-3">
                        <MapPin className="h-3.5 w-3.5 text-gray-700 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-900">{formatAddress(currentClient)}</span>
                      </div>
                    )}
                    {currentClient.type === 'COMPANY' && currentClient.taxId && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 border border-gray-200">
                        <Receipt className="h-3.5 w-3.5 text-gray-700" />
                        <span className="text-xs font-medium text-gray-900 truncate">{currentClient.taxId}</span>
                      </div>
                    )}
                    {currentClient.birthday && (
                      <div className={`flex items-center gap-2 p-2 rounded-md border ${
                        isBirthday
                          ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200'
                          : 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200'
                      }`}>
                        <Calendar className={`h-3.5 w-3.5 ${isBirthday ? 'text-pink-700' : 'text-pink-600'}`} />
                        <span className="text-xs font-medium text-gray-900">{formatDate(currentClient.birthday)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-1.5 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
              <Gift className="h-3 w-3 text-green-600" />
              Lifetime Spend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(currentClient.lifetimeSpend)}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              Gross payments on booked visits
            </div>
          </CardContent>
        </Card>
        <Card className="border border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50">
          <CardHeader className="pb-1.5 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-pink-600" />
              Total Visits
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-gray-900">{currentClient.totalVisits}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {currentClient.appointments?.length || 0} appointment{currentClient.appointments?.length !== 1 ? 's' : ''} on file
            </div>
            {currentClient.upcomingThisWeek > 0 && (
              <div className="text-xs text-blue-600 mt-0.5 font-medium">
                {currentClient.upcomingThisWeek} this week ({formatCurrency(currentClient.upcomingAmount || 0)})
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
          <CardHeader className="pb-1.5 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-purple-600" />
              Last Visit
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-sm font-bold text-gray-900">
              {currentClient.lastVisit ? formatDate(currentClient.lastVisit) : 'Never'}
            </div>
          </CardContent>
        </Card>
        <Card className={`border ${isHighLoyalty ? 'border-yellow-400' : 'border-yellow-200'} bg-gradient-to-br from-yellow-50 to-amber-50`}>
          <CardHeader className="pb-1.5 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
              <Gift className="h-3 w-3 text-yellow-600" />
              Loyalty Points
              {isHighLoyalty && (
                <Badge variant="secondary" className="ml-1 bg-yellow-400 text-yellow-900 text-xs px-1 py-0 h-4">
                  High
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-gray-900">
              {loyaltyPoints}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts - Show when viewing a company */}
      {currentClient.type === 'COMPANY' && currentClient.contacts && currentClient.contacts.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              People at {getClientDisplayName(currentClient)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {currentClient.contacts.map((contact: any) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => router.push(`/app/clients/${contact.id}`)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-pink-200 text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-pink-100 text-pink-700 text-xs">
                      {getClientInitials(contact)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{contact.firstName} {contact.lastName}</p>
                    {contact.email && <p className="text-xs text-gray-500">{contact.email}</p>}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Bills Card - Show if there are pending bills */}
      {hasPendingBills && (
        <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-orange-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Pending Bills
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-orange-900">
                  {formatCurrency(pendingBalance)}
                </div>
                {pendingBillsCount > 0 && (
                  <div className="text-xs text-orange-700 mt-0.5 font-medium">
                    {pendingBillsCount} unpaid appointment{pendingBillsCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-orange-200">
                <CreditCard className="h-5 w-5 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="appointments" className="flex flex-col min-h-0">
        <TabsList className="flex-shrink-0">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="strikes">Strikes</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-3 flex-1 min-h-0">
          <Card>
            <CardHeader className="pb-3 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Appointment History</CardTitle>
                {currentClient.appointments && currentClient.appointments.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {currentClient.appointments.filter((a: any) => a.status === 'CONFIRMED' || a.status === 'COMPLETED').length} booked • {currentClient.appointments.length} total
                  </div>
                )}
              </div>
              {currentClient.totalVisits === 0 && (currentClient.appointments?.length || 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Visits and spend count after an appointment is CONFIRMED or COMPLETED (BOOKED requests are not included until you accept them).
                </p>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4 flex-1 min-h-0 overflow-y-auto">
              {currentClient.appointments && currentClient.appointments.length > 0 ? (
                <div className="space-y-2">
                  {currentClient.appointments.map((apt: any) => {
                    const isCompleted = apt.status === 'COMPLETED'
                    const isCancelled = apt.status === 'CANCELLED' || apt.status === 'NO_SHOW' || apt.status === 'LATE_CANCEL'
                    const isConfirmed = apt.status === 'CONFIRMED'
                    const isBooked = apt.status === 'BOOKED'
                    const isInPipeline = Boolean(
                      apt.appointmentServices?.some((as: any) => as?.pipelineProject?.id)
                    )
                    const showInProgress = isInPipeline && !isCompleted && !isCancelled
                    const statusLabel = showInProgress ? 'IN PROGRESS' : String(apt.status)
                    const totalPrice = Number(apt.totalPrice || 0)
                    const grossPaid = grossPaymentsTotal(apt.payments)
                    const balanceDue = invoiceBalanceDue(totalPrice, apt.payments)
                    const isFullyPaid = totalPrice > 0 && balanceDue <= 0.01
                    const isPartiallyPaid = totalPrice > 0 && grossPaid > 0 && balanceDue > 0.01

                    return (
                      <div
                        key={apt.id}
                        onClick={() => {
                          setSelectedAppointment(apt)
                          setIsAppointmentDialogOpen(true)
                        }}
                        className={`flex items-start justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                          isCompleted
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                            : isCancelled
                            ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200 opacity-75'
                          : showInProgress
                            ? 'bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200'
                            : isConfirmed
                            ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200'
                            : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`p-1.5 rounded-md flex-shrink-0 ${
                              isCompleted
                                ? 'bg-green-100'
                                : isCancelled
                                ? 'bg-red-100'
                              : showInProgress
                                ? 'bg-sky-100'
                                : isConfirmed
                                ? 'bg-pink-100'
                                : 'bg-gray-100'
                            }`}>
                              <Calendar className={`h-3.5 w-3.5 ${
                                isCompleted
                                  ? 'text-green-600'
                                  : isCancelled
                                  ? 'text-red-600'
                                : showInProgress
                                  ? 'text-sky-700'
                                  : isConfirmed
                                  ? 'text-pink-600'
                                  : 'text-gray-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-gray-900">
                                {formatDateTime(apt.startAt)}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {apt.appointmentServices
                                  ?.map((as: any) => as.service.name)
                                  .join(', ')}
                              </div>
                            </div>
                          </div>
                          {apt.notes && (
                            <div className="text-xs text-gray-500 mt-1.5 pl-9 italic">
                              {apt.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-3 flex-shrink-0 flex flex-col items-end gap-1">
                          <Badge 
                            variant={isCompleted ? 'default' : isCancelled ? 'destructive' : 'secondary'}
                            className={`font-semibold text-xs ${
                              isCompleted
                                ? 'bg-green-600 text-white border-0'
                                : isCancelled
                                ? 'bg-red-600 text-white border-0'
                              : showInProgress
                                ? 'bg-sky-600 text-white border-0'
                                : isConfirmed
                                ? 'bg-pink-600 text-white border-0'
                                : 'bg-gray-600 text-white border-0'
                            }`}
                          >
                            {statusLabel}
                          </Badge>
                          {totalPrice > 0 && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-semibold px-2 py-0 h-5 border ${
                                isFullyPaid
                                  ? 'bg-green-600 text-white border-green-600'
                                  : isPartiallyPaid
                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                  : 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}
                            >
                              {isFullyPaid
                                ? 'Paid'
                                : isPartiallyPaid
                                  ? `Paid ${formatCurrency(grossPaid)}`
                                  : 'Pending'}
                            </Badge>
                          )}
                          <div className={`text-sm font-bold mt-0.5 ${
                            isCompleted
                              ? 'text-green-700'
                              : isCancelled
                              ? 'text-red-700'
                              : 'text-gray-500'
                          }`}>
                            {formatCurrency(apt.totalPrice)}
                            {!isCompleted && (
                              <span className="text-xs font-normal ml-1 text-gray-400">(not counted)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No appointments yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty" className="mt-3 flex-1 min-h-0">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Points Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {currentClient.loyaltyTransactions && currentClient.loyaltyTransactions.length > 0 ? (
                <div className="space-y-4">
                  {currentClient.loyaltyTransactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div>
                        <div className="font-medium">{tx.reason}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(tx.createdAt)}
                        </div>
                      </div>
                      <div
                        className={`font-medium ${
                          tx.deltaPoints > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tx.deltaPoints > 0 ? '+' : ''}
                        {tx.deltaPoints} points
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No loyalty transactions</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strikes" className="mt-3 flex-1 min-h-0">
          <Card>
            <CardHeader>
              <CardTitle>Strike History</CardTitle>
            </CardHeader>
            <CardContent>
              {client.strikeEvents && client.strikeEvents.length > 0 ? (
                <div className="space-y-3">
                  {client.strikeEvents.flatMap((strike: any) => {
                    // Expand strikes with delta > 1 into individual entries
                    const expandedStrikes = []
                    for (let i = 0; i < strike.delta; i++) {
                      expandedStrikes.push(
                        <div
                          key={`${strike.id}-${i}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <Badge variant="destructive" className="font-semibold">
                                {strike.type === 'NO_SHOW' ? 'No Show' :
                                 strike.type === 'LATE_CANCEL' ? 'Late Cancel' :
                                 strike.type === 'MANUAL' ? 'Manual' : strike.type}
                              </Badge>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatDateTime(strike.createdAt)}
                              </div>
                              {strike.appointment && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Appointment: {formatDateTime(strike.appointment.startAt)}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="destructive" className="font-bold">+1</Badge>
                        </div>
                      )
                    }
                    return expandedStrikes
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No strikes</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-3 flex-1 min-h-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notes & Preferences</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isEditingNotes) {
                      setNotes(currentClient.notes || '')
                    }
                    setIsEditingNotes(!isEditingNotes)
                  }}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <div className="space-y-4">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this client..."
                    rows={6}
                    className="resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNotes(currentClient.notes || '')
                        setIsEditingNotes(false)
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        setIsSaving(true)
                        try {
                          await updateClient(currentClient.id, { notes: notes || undefined })
                          toast({
                            title: 'Success',
                            description: 'Notes updated successfully',
                          })
                          router.refresh()
                          setIsEditingNotes(false)
                          // Update local client state immediately
                          if (onClientUpdated) {
                            onClientUpdated()
                          }
                        } catch (error: any) {
                          toast({
                            title: 'Error',
                            description: error.message || 'Failed to update notes',
                            variant: 'destructive',
                          })
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                currentClient.notes ? (
                  <p className="whitespace-pre-wrap">{currentClient.notes}</p>
                ) : (
                  <p className="text-muted-foreground">No notes</p>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditClientDialog
        client={currentClient}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onClientUpdated={onClientUpdated}
        companies={clients?.filter((c) => c.type === 'COMPANY') || []}
        people={clients?.filter((c) => c.type === 'INDIVIDUAL').map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, companyId: c.companyId })) || []}
      />

      {/* Appointment Dialog */}
      {selectedAppointment && (
        <AppointmentDialog
          appointment={selectedAppointment}
          services={services}
          clients={clients}
          staff={staff}
          open={isAppointmentDialogOpen}
          onOpenChange={(open) => {
            setIsAppointmentDialogOpen(open)
            if (!open) {
              setSelectedAppointment(null)
              // Refresh client data to show updated payment info
              router.refresh()
            }
          }}
        />
      )}
    </div>
  )
}
