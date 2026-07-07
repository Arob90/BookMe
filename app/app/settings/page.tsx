import { AppTopbar } from '@/components/app-topbar'
import { SettingsTabs } from '@/components/settings-tabs'
import { getSettings } from '@/app/actions/settings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { getBillingHistoryRowsForStaffId } from '@/lib/billing-history'
import { getTeamMembersForBusiness } from '@/app/actions/team-members'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const settings = await getSettings()
  const staffId = getSessionStaffId(session)
  let billingHistory: Awaited<ReturnType<typeof getBillingHistoryRowsForStaffId>> = []
  try {
    billingHistory = await getBillingHistoryRowsForStaffId(staffId)
  } catch {
    billingHistory = []
  }

  // Team & Permissions lives here as a tab (owner-admins only).
  let teamData: Awaited<ReturnType<typeof getTeamMembersForBusiness>> | null = null
  if ((session.user as { role?: string })?.role === 'ADMIN') {
    try {
      teamData = await getTeamMembersForBusiness()
    } catch {
      teamData = null
    }
  }

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Settings" />
      <div className="flex-1 overflow-y-auto bg-transparent flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:px-6 lg:pt-6 lg:pb-6 space-y-6">
          <SettingsTabs
            initialSettings={settings}
            billingHistory={billingHistory}
            teamData={teamData}
            initialTab={searchParams.tab}
          />
        </div>
      </div>
    </div>
  )
}

