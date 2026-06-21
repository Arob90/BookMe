import { AppTopbar } from '@/components/app-topbar'
import { ReportsDashboard } from '@/components/reports-dashboard'
import { getRevenueReport, getTopClients, getNoShowReport } from '@/app/actions/reports'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [revenue, topClients, noShows] = await Promise.all([
    getRevenueReport(startOfMonth, endOfMonth),
    getTopClients(10),
    getNoShowReport(startOfMonth, endOfMonth),
  ])

  return (
    <>
      <AppTopbar title="Reports" />
      <div className="p-3 sm:p-6">
        <ReportsDashboard
          revenue={revenue}
          topClients={topClients}
          noShows={noShows}
        />
      </div>
    </>
  )
}
