'use client'

import { useState, useEffect } from 'react'
import { onSyncEvent } from '@/lib/sync-events'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, Plus, DollarSign, Calendar, CreditCard, ChevronLeft, ChevronRight, Cake, Building2, Users, UserCircle } from 'lucide-react'
import { formatCurrency, getClientDisplayName, getClientInitials, getClientCompanyName, isBirthdayThisMonth, isBirthdayToday, generateClientId } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClientModal } from '@/components/client-modal'
import { CreateClientDialog } from '@/components/create-client-dialog'
import { getClient } from '@/app/actions/clients'

interface ClientsListProps {
  initialClients: any[]
}

export function ClientsList({ initialClients }: ClientsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [filter, setFilter] = useState<string>(searchParams.get('filter') || 'all')
  const [viewMode, setViewMode] = useState<'flat' | 'byCompany' | 'individual'>('flat')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCompanyContacts, setSelectedCompanyContacts] = useState<any[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [loadingClient, setLoadingClient] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [companyPage, setCompanyPage] = useState(1)
  const [itemsPerPage] = useState(12)
  const [companiesPerPage] = useState(12)
  const [clients, setClients] = useState(initialClients)

  // Update clients when initialClients prop changes
  useEffect(() => {
    setClients(initialClients)
  }, [initialClients])

  // Listen for sync events and refresh client data
  useEffect(() => {
    const handleSync = () => {
      router.refresh()
    }

    const cleanup1 = onSyncEvent('payment-recorded', handleSync)
    const cleanup2 = onSyncEvent('client-updated', handleSync)
    const cleanup3 = onSyncEvent('client-created', handleSync)
    const cleanup4 = onSyncEvent('appointment-updated', handleSync)

    return () => {
      cleanup1()
      cleanup2()
      cleanup3()
      cleanup4()
    }
  }, [router])

  const handleClientClick = async (clientId: string) => {
    setLoadingClient(true)
    try {
      const client = await getClient(clientId)
      setSelectedClient(client)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to load client:', error)
    } finally {
      setLoadingClient(false)
    }
  }

  // Client-side filtering for instant feedback
  // Server-side filters are already applied via searchParams in the page component
  const filteredClients = clients.filter((client) => {
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch = (
        client.firstName?.toLowerCase().includes(searchLower) ||
        client.lastName?.toLowerCase().includes(searchLower) ||
        client.companyName?.toLowerCase().includes(searchLower) ||
        client.contactName?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.toLowerCase().includes(searchLower)
      )
      if (!matchesSearch) return false
    }
    
    // Apply category filters
    if (filter === 'individual') {
      return client.type === 'INDIVIDUAL'
    }
    if (filter === 'company') {
      return client.type === 'COMPANY'
    }
    if (filter === 'birthday') {
      return isBirthdayThisMonth(client.birthday)
    }
    if (filter === 'strikes') {
      return (client.strikeEvents?.length || 0) > 0
    }
    if (filter === 'vip') {
      return client.tags?.includes('VIP')
    }
    
    return true
  })

  // Grouped structure for "By Company" view
  const companies = filteredClients.filter((c) => c.type === 'COMPANY')
  const companyIds = new Set(companies.map((c) => c.id))
  const individualsWithCompany = filteredClients.filter((c) => c.type === 'INDIVIDUAL' && c.companyId)
  const individualsWithoutCompany = filteredClients.filter((c) => c.type === 'INDIVIDUAL' && !c.companyId)
  const companyContactsMap = individualsWithCompany.reduce((acc, p) => {
    const cid = p.companyId!
    if (!companyIds.has(cid)) return acc
    if (!acc[cid]) acc[cid] = []
    acc[cid].push(p)
    return acc
  }, {} as Record<string, typeof filteredClients>)
  const orphanedContacts = individualsWithCompany.filter((p) => !companyIds.has(p.companyId!))

  // Clients to show for flat/individual view (individual view = only INDIVIDUAL type)
  const flatViewClients = viewMode === 'individual'
    ? filteredClients.filter((c) => c.type === 'INDIVIDUAL')
    : filteredClients
  const totalPages = Math.ceil(flatViewClients.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedClients = flatViewClients.slice(startIndex, endIndex)

  // Pagination for By Company view
  const totalCompanyPages = Math.ceil(companies.length / companiesPerPage)
  const companyStart = (companyPage - 1) * companiesPerPage
  const paginatedCompanies = companies.slice(companyStart, companyStart + companiesPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
    setCompanyPage(1)
  }, [search, filter, viewMode])

  const renderClientCard = (client: (typeof filteredClients)[0]) => {
    const visitCount = client.completedVisits || 0
    const totalSpend = client.lifetimeSpend || 0
    const pendingBalance = client.pendingBalance || 0
    const pendingBillsCount = client.pendingBillsCount || 0
    const hasPendingBills = client.hasPendingBills || false
    const upcomingThisWeek = client.upcomingThisWeek || 0
    const isBirthday = isBirthdayToday(client.birthday)
    const clientId = generateClientId(
      client.firstName,
      client.lastName,
      client.birthday,
      filteredClients,
      client.id,
      { type: client.type, companyFoundedAt: client.companyFoundedAt }
    )
    const avatarColors = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']
    const displayName = getClientDisplayName(client)
    const colorIndex = displayName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length
    const avatarColor = avatarColors[colorIndex]
    const companyName = getClientCompanyName(client)

    return (
      <Card
        key={client.id}
        onClick={() => handleClientClick(client.id)}
        className="flex h-full min-h-[9.5rem] cursor-pointer flex-col border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex flex-1 flex-col gap-2.5 p-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className={`${avatarColor} text-sm font-semibold text-white`}>
                {getClientInitials(client)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-semibold text-gray-900">{displayName}</h3>
                {isBirthday && <Cake className="h-3.5 w-3.5 shrink-0 text-pink-500" />}
              </div>
              {companyName ? (
                <p className="flex items-start gap-1 text-xs text-muted-foreground">
                  <Building2 className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="line-clamp-2 break-words">{companyName}</span>
                </p>
              ) : null}
              <p className="text-xs tabular-nums text-muted-foreground">ID {clientId}</p>
              <div className="space-y-0.5 text-xs text-gray-700">
                {client.email?.trim() ? <p className="truncate">{client.email.trim()}</p> : null}
                {client.phone?.trim() ? <p className="truncate tabular-nums">{client.phone.trim()}</p> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {isBirthday && (
              <Badge className="bg-pink-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-pink-500">
                Birthday
              </Badge>
            )}
            {client.tags?.includes('VIP') && (
              <Badge className="bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-500">
                VIP
              </Badge>
            )}
            {hasPendingBills && (
              <Badge className="bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-orange-500">
                Bill ({pendingBillsCount})
              </Badge>
            )}
          </div>
          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
              <span className="font-medium text-gray-900">{formatCurrency(totalSpend)}</span>
              <span className="text-muted-foreground">spent</span>
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
              <span className="font-medium text-gray-900">{visitCount}</span>
              <span className="text-muted-foreground">visits</span>
              {upcomingThisWeek > 0 ? (
                <span className="text-sky-700">· {upcomingThisWeek} this week</span>
              ) : null}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CreditCard
                className={`h-3.5 w-3.5 shrink-0 ${hasPendingBills ? 'text-orange-600' : 'text-gray-400'}`}
                aria-hidden
              />
              <span className={hasPendingBills ? 'font-medium text-orange-700' : 'font-medium text-gray-600'}>
                {formatCurrency(pendingBalance)}
              </span>
              <span className="text-muted-foreground">pending</span>
            </span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0 mb-2 sm:mb-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 sm:pl-9 text-sm sm:text-base h-9 sm:h-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[160px] lg:w-[180px] h-9 sm:h-10 text-sm sm:text-base">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="birthday">Birthdays This Month</SelectItem>
            <SelectItem value="strikes">Has Strikes</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (filter !== 'all') params.set('filter', filter)
            router.push(`/app/clients?${params.toString()}`)
            router.refresh()
          }}
          className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
        >
          Apply Filters
        </Button>
        <div className="flex gap-1 border rounded-md p-0.5 bg-muted/50">
          <button
            type="button"
            onClick={() => setViewMode('byCompany')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              viewMode === 'byCompany' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            By Company
          </button>
          <button
            type="button"
            onClick={() => setViewMode('individual')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              viewMode === 'individual' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserCircle className="h-3.5 w-3.5" />
            Individual
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flat')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              viewMode === 'flat' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            All
          </button>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)} 
          className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          New Client
        </Button>
      </div>

      {filteredClients.length === 0 ? (
        <Card className="p-12 text-center flex-shrink-0">
          <p className="text-muted-foreground">No clients found</p>
        </Card>
      ) : viewMode === 'byCompany' ? (
        <>
        <div className="grid flex-1 min-h-0 auto-rows-min grid-cols-1 content-start items-stretch justify-items-stretch gap-2.5 overflow-y-auto sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {paginatedCompanies.map((company) => {
            const contacts = companyContactsMap[company.id] || []
            return (
                <Card
                  key={company.id}
                  className="flex h-full min-h-[9.5rem] w-full cursor-pointer flex-col border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  onClick={async () => {
                    setSelectedCompanyContacts(contacts)
                    await handleClientClick(company.id)
                  }}
                >
                  <div className="flex flex-1 flex-col gap-2.5 p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-pink-500 text-sm font-semibold text-white">
                          {getClientInitials(company)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                          {getClientDisplayName(company)}
                        </h3>
                        <p className="flex items-start gap-1 text-xs text-muted-foreground">
                          <Users className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>
                            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                          </span>
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          ID{' '}
                          {generateClientId(
                            company.firstName,
                            company.lastName,
                            company.birthday,
                            filteredClients,
                            company.id,
                            { type: company.type, companyFoundedAt: company.companyFoundedAt }
                          )}
                        </p>
                        <div className="space-y-0.5 text-xs text-gray-700">
                          {company.email?.trim() ? <p className="truncate">{company.email.trim()}</p> : null}
                          {company.phone?.trim() ? <p className="truncate tabular-nums">{company.phone.trim()}</p> : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                        <span className="font-medium text-gray-900">
                          {formatCurrency(company.lifetimeSpend || 0)}
                        </span>
                        <span className="text-muted-foreground">spent</span>
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
                        <span className="font-medium text-gray-900">{company.completedVisits || 0}</span>
                        <span className="text-muted-foreground">visits</span>
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <CreditCard className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                        <span className="font-medium text-gray-600">
                          {formatCurrency(company.pendingBalance || 0)}
                        </span>
                        <span className="text-muted-foreground">pending</span>
                      </span>
                    </div>
                  </div>
                </Card>
            )
          })}
        </div>

        {/* Pagination for By Company view */}
        {companies.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 pt-2 sm:pt-3 border-t border-gray-200 flex-shrink-0 mt-2">
            <div className="hidden sm:block flex-1" />
            <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground text-center order-2 sm:order-1">
              Showing {companyStart + 1} to {Math.min(companyStart + companiesPerPage, companies.length)} of {companies.length} compan{companies.length !== 1 ? 'ies' : 'y'}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 sm:justify-end justify-center order-1 sm:order-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCompanyPage(prev => Math.max(1, prev - 1))}
                disabled={companyPage === 1}
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page {companyPage} of {Math.max(1, totalCompanyPages)}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCompanyPage(prev => Math.min(totalCompanyPages, prev + 1))}
                disabled={companyPage >= totalCompanyPages}
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        )}
        </>
      ) : flatViewClients.length === 0 && viewMode === 'individual' ? (
        <Card className="p-12 text-center flex-shrink-0">
          <p className="text-muted-foreground">No individuals found</p>
        </Card>
      ) : (
        <>
          <div className="grid flex-1 min-h-0 auto-rows-min content-start items-stretch gap-2.5 overflow-y-auto sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedClients.map((client) => renderClientCard(client))}
          </div>

          {/* Pagination Controls - Always show if there are clients */}
          {flatViewClients.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 pt-2 sm:pt-3 border-t border-gray-200 flex-shrink-0 mt-2">
              <div className="hidden sm:block flex-1"></div>
              <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground text-center order-2 sm:order-1">
                Showing {startIndex + 1} to {Math.min(endIndex, flatViewClients.length)} of {flatViewClients.length} client{flatViewClients.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 flex-1 sm:justify-end justify-center order-1 sm:order-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {/* Mobile: Show only first, current, and last page */}
                    <div className="flex sm:hidden items-center gap-0.5">
                      {currentPage > 2 && (
                        <>
                          <Button
                            variant={currentPage === 1 ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            className="min-w-[28px] h-7 text-[10px]"
                          >
                            1
                          </Button>
                          {currentPage > 3 && (
                            <span className="px-0.5 text-muted-foreground text-[10px]">...</span>
                          )}
                        </>
                      )}
                      {currentPage > 1 && currentPage < totalPages && (
                        <Button
                          variant="default"
                          size="sm"
                          className="min-w-[28px] h-7 text-[10px]"
                        >
                          {currentPage}
                        </Button>
                      )}
                      {currentPage < totalPages - 1 && (
                        <>
                          {currentPage < totalPages - 2 && (
                            <span className="px-0.5 text-muted-foreground text-[10px]">...</span>
                          )}
                          <Button
                            variant={currentPage === totalPages ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="min-w-[28px] h-7 text-[10px]"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    {/* Desktop: Show more pages */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="min-w-[32px] h-8 text-xs"
                            >
                              {page}
                            </Button>
                          )
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <span key={page} className="px-1 text-muted-foreground text-xs">
                              ...
                            </span>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    title="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
            </div>
          )}
        </>
      )}

      {selectedClient && (
        <ClientModal
          client={selectedClient}
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open)
            if (!open) {
              setSelectedClient(null)
              setSelectedCompanyContacts([])
            }
          }}
          onClientUpdated={() => {
            router.refresh()
            setIsModalOpen(false)
            setSelectedClient(null)
            setSelectedCompanyContacts([])
          }}
          clients={clients}
          associatedClients={selectedClient?.type === 'COMPANY' ? selectedCompanyContacts : []}
        />
      )}

      <CreateClientDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onClientCreated={() => router.refresh()}
        companies={clients.filter((c) => c.type === 'COMPANY')}
        people={clients.filter((c) => c.type === 'INDIVIDUAL').map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, companyId: c.companyId }))}
      />
    </div>
  )
}
