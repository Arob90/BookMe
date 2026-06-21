import { AppTopbar } from '@/components/app-topbar'
import { PoliciesSettings } from '@/components/policies-settings'
import { getSettings } from '@/app/actions/settings'
import { getStrikes } from '@/app/actions/strikes'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [settings, strikes] = await Promise.all([
    getSettings(),
    getStrikes(),
  ])

  return (
    <>
      <AppTopbar title="Strike Policies" />
      <div className="p-3 sm:p-6">
        <PoliciesSettings initialSettings={settings} initialStrikes={strikes} />
      </div>
    </>
  )
}
