'use client'

import type { ComponentProps } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AccountManagement, type ManagedUser } from '@/components/account-management'
import { AccountRequestsList, type AccountRequestRow } from '@/components/account-requests-list'
import { PendingApprovalsList, type PendingApproval } from '@/components/pending-approvals-list'
import { IdeasAdmin } from '@/components/ideas-admin'
import { SupportAdmin } from '@/components/support-admin'

type AdminTab = 'accounts' | 'appointments' | 'account-requests' | 'ideas' | 'support'

function normalizeDefaultTab(tab: string | undefined): AdminTab {
  if (tab === 'appointments' || tab === 'account-requests' || tab === 'accounts' || tab === 'ideas' || tab === 'support') {
    return tab
  }
  return 'accounts'
}

export interface AccountsAdminTabsProps {
  users: ManagedUser[]
  approvals: PendingApproval[]
  requests: AccountRequestRow[]
  ideas: ComponentProps<typeof IdeasAdmin>['ideas']
  reports: ComponentProps<typeof SupportAdmin>['reports']
  /** From URL `?tab=`, e.g. `account-requests` */
  defaultTab?: string
}

export function AccountsAdminTabs({ users, approvals, requests, ideas, reports, defaultTab }: AccountsAdminTabsProps) {
  const initialTab = normalizeDefaultTab(defaultTab)
  const pendingIdeas = ideas.filter((i) => i.status === 'PENDING').length
  const openReports = reports.filter((r) => r.status !== 'COMPLETED').length

  return (
    <Tabs key={initialTab} defaultValue={initialTab} className="mx-auto w-full max-w-5xl">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1.5 sm:grid-cols-5">
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
        <TabsTrigger
          value="ideas"
          className="flex flex-wrap items-center justify-center gap-1.5 py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm sm:text-sm"
        >
          <span>Ideas</span>
          {pendingIdeas > 0 && (
            <Badge className="h-5 border-0 bg-pink-500 px-1.5 text-[10px] font-semibold text-white tabular-nums">
              {pendingIdeas}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="support"
          className="flex flex-wrap items-center justify-center gap-1.5 py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm sm:text-sm"
        >
          <span className="text-center leading-tight">Tech Support</span>
          {openReports > 0 && (
            <Badge className="h-5 border-0 bg-pink-500 px-1.5 text-[10px] font-semibold text-white tabular-nums">
              {openReports}
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
      <TabsContent value="ideas" className="mt-6 outline-none focus-visible:ring-0">
        <IdeasAdmin ideas={ideas} />
      </TabsContent>
      <TabsContent value="support" className="mt-6 outline-none focus-visible:ring-0">
        <SupportAdmin reports={reports} />
      </TabsContent>
    </Tabs>
  )
}
