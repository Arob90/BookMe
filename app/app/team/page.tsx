import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppTopbar } from '@/components/app-topbar'
import { StaffManager } from '@/components/staff-manager'
import { getTeamMembersForBusiness } from '@/app/actions/team-members'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const session = (await getServerSession(authOptions)) as any
  if (!session) redirect('/login')
  // Only business owners / admins manage staff. Staff are sent to the dashboard.
  if (session.user?.role !== 'ADMIN') redirect('/app/dashboard')

  let data: Awaited<ReturnType<typeof getTeamMembersForBusiness>> | null = null
  try {
    data = await getTeamMembersForBusiness()
  } catch {
    data = null
  }

  return (
    <div className="flex h-full flex-col">
      <AppTopbar title="Team & Permissions" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {data ? (
          <StaffManager data={data} />
        ) : (
          <p className="mx-auto max-w-md text-center text-sm text-slate-500">Couldn’t load your team. Please refresh.</p>
        )}
      </div>
    </div>
  )
}
