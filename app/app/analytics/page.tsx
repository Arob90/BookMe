import { AppTopbar } from '@/components/app-topbar'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSalesAnalytics, getAppointmentStats, getClientGrowth, getTopServices, getMonthlyComparison, getPeakTimes } from '@/app/actions/analytics'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [
    monthlySales,
    appointmentStats,
    clientGrowth,
    topServices,
    monthlyComparison,
    peakTimes,
  ] = await Promise.all([
    getSalesAnalytics('month'),
    getAppointmentStats('month'), // Use same period as monthlySales
    getClientGrowth(),
    getTopServices(),
    getMonthlyComparison(),
    getPeakTimes(),
  ])

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Analytics" />
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 bg-transparent">
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          Revenue and service charts use confirmed and completed appointments for your business (owner and team).
          The appointment status pie includes booked and other statuses for the same period.
        </p>
        <AnalyticsDashboard
          monthlySales={monthlySales}
          appointmentStats={appointmentStats}
          clientGrowth={clientGrowth}
          topServices={topServices}
          monthlyComparison={monthlyComparison}
          peakTimes={peakTimes}
        />
      </div>
    </div>
  )
}

