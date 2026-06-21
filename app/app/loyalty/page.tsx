import { AppTopbar } from '@/components/app-topbar'
import { LoyaltyStrikeDashboard } from '@/components/loyalty-strike-dashboard'
import { getLoyaltyAccounts } from '@/app/actions/loyalty'
import { getStrikes } from '@/app/actions/strikes'
import { getSettings } from '@/app/actions/settings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [accounts, strikes, settings] = await Promise.all([
    getLoyaltyAccounts(),
    getStrikes(),
    getSettings(),
  ])

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Loyalty & Strike" />
      <div className="flex-1 overflow-hidden p-2 sm:p-3 bg-transparent">
        <LoyaltyStrikeDashboard 
          loyaltyAccounts={accounts}
          strikeEvents={strikes}
          settings={settings}
        />
      </div>
    </div>
  )
}

