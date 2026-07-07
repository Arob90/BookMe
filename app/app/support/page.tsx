import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppTopbar } from '@/components/app-topbar'
import { SupportPanel } from '@/components/support-panel'
import { getMySupportReports } from '@/app/actions/support'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

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
