import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/authz'
import { AppTopbar } from '@/components/app-topbar'
import { SupportPanel } from '@/components/support-panel'
import { SupportAdmin } from '@/components/support-admin'
import { getMySupportReports, getAllSupportReports } from '@/app/actions/support'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isAdmin = isSuperAdmin((session.user as { email?: string })?.email)

  if (isAdmin) {
    const reports = await getAllSupportReports().catch(() => [])
    return (
      <div className="flex flex-col h-full">
        <AppTopbar title="Tech Support — Manage" />
        <div className="flex-1 overflow-y-auto bg-transparent p-4 lg:p-6">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            <p className="text-sm text-muted-foreground">
              Incoming bug reports. Set the status and leave a note — it shows on the reporter’s support page.
            </p>
            <SupportAdmin reports={reports} />
          </div>
        </div>
      </div>
    )
  }

  const mine = await getMySupportReports().catch(() => [])

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Tech Support" />
      <div className="flex-1 overflow-y-auto bg-transparent p-4 lg:p-6">
        <SupportPanel mine={mine} />
      </div>
    </div>
  )
}
