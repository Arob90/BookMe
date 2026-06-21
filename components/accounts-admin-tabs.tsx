'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AccountManagement, type ManagedUser } from '@/components/account-management'
import { AccountRequestsList, type AccountRequestRow } from '@/components/account-requests-list'
import { PendingApprovalsList, type PendingApproval } from '@/components/pending-approvals-list'

type AdminTab = 'accounts' | 'appointments' | 'account-requests'

function normalizeDefaultTab(tab: string | undefined): AdminTab {
  if (tab === 'appointments' || tab === 'account-requests' || tab === 'accounts') {
    return tab
  }
  return 'accounts'
}

export interface AccountsAdminTabsProps {
  users: ManagedUser[]
  approvals: PendingApproval[]
  requests: AccountRequestRow[]
  /** From URL `?tab=`, e.g. `account-requests` */
  defaultTab?: string
}

export function AccountsAdminTabs({ users, approvals, requests, defaultTab }: AccountsAdminTabsProps) {
  const initialTab = normalizeDefaultTab(defaultTab)

  return (
    <Tabs key={initialTab} defaultValue={initialTab} className="mx-auto w-full max-w-5xl">
      <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-lg bg-gray-100 p-1.5 sm:grid-cols-3">
        <TabsTrigger
          value="accounts"
          className="flex flex-wrap items-center justify-center gap-1.5 py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm sm:text-sm"
        >
          <span>Accounts</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold tabular-nums">
            {users.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="appointments"
          className="flex flex-wrap items-center justify-center gap-1.5 py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm sm:text-sm"
        >
          <span className="text-center leading-tight">Appointment requests</span>
          {approvals.length > 0 && (
            <Badge className="h-5 border-0 bg-pink-500 px-1.5 text-[10px] font-semibold text-white tabular-nums">
              {approvals.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="account-requests"
          className="flex flex-wrap items-center justify-center gap-1.5 py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm sm:text-sm"
        >
          <span className="text-center leading-tight">Account requests</span>
          {requests.length > 0 && (
            <Badge className="h-5 border-0 bg-pink-500 px-1.5 text-[10px] font-semibold text-white tabular-nums">
              {requests.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="accounts" className="mt-6 outline-none focus-visible:ring-0">
        <AccountManagement initialUsers={users} />
      </TabsContent>
      <TabsContent value="appointments" className="mt-6 outline-none focus-visible:ring-0">
        <PendingApprovalsList initialApprovals={approvals} />
      </TabsContent>
      <TabsContent value="account-requests" className="mt-6 outline-none focus-visible:ring-0">
        <AccountRequestsList initialRequests={requests} />
      </TabsContent>
    </Tabs>
  )
}
