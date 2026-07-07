import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { AppTopbar } from '@/components/app-topbar'
import { PromotionsManager } from '@/components/promotions-manager'
import { getMyPromotions } from '@/app/actions/promotions'

export const dynamic = 'force-dynamic'

export default async function PromotionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Only business admins manage promotions (mirrors the sidebar gate).
  if ((session.user as { role?: string })?.role !== 'ADMIN') {
    redirect('/app/dashboard')
  }

  const staffId = getSessionStaffId(session)
  let promotions: Awaited<ReturnType<typeof getMyPromotions>> = []
  try {
    promotions = await getMyPromotions()
  } catch {
    promotions = []
  }

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Promotions" />
      <div className="flex-1 overflow-y-auto bg-transparent p-4 lg:p-6">
        <PromotionsManager initialPromotions={promotions} profileHref={staffId ? `/b/${staffId}` : null} />
      </div>
    </div>
  )
}
