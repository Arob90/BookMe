import { AppTopbar } from '@/components/app-topbar'
import Dashboard from '@/components/dashboard'
import { getAppointments } from '@/app/actions/appointments'
import { getClients } from '@/app/actions/clients'
import { getLoyaltyAccounts } from '@/app/actions/loyalty'
import { getStrikes } from '@/app/actions/strikes'
import { getServices, reconcileServiceStaffIds } from '@/app/actions/services'
import { getLowStockItems } from '@/app/actions/inventory'
import { getTasks } from '@/app/actions/tasks'
import { getReminders } from '@/app/actions/reminders'
import { getRecentProjects, getProjectCount } from '@/app/actions/projects'
import { getBusinessPendingBillsSummary } from '@/app/actions/payments'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { startOfDay, endOfDay, endOfWeek } from 'date-fns'
import { isBirthdayThisMonth } from '@/lib/utils'
import { getSessionStaffId } from '@/lib/session-staff'
import { getUsersForBusinessStaffId } from '@/lib/business-users'
import { countsTowardRevenueTotal } from '@/lib/appointment-status'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 })

  let lowStockItems: any[] = []
  try {
    lowStockItems = await getLowStockItems()
  } catch (error) {
    console.error('Error loading low stock items:', error)
    lowStockItems = []
  }

  await reconcileServiceStaffIds().catch(() => {})

  // Optimize: Only fetch what's needed for dashboard
  const [
    todayAppointments,
    upcomingAppointments,
    birthdayClients,
    loyaltyAccounts,
    strikeEvents,
    services,
    upcomingTasks,
    upcomingReminders,
    recentProjects,
    projectCount,
    pendingBillsSummary,
  ] = await Promise.all([
    getAppointments(todayStart, todayEnd, true), // Minimal data for dashboard
    getAppointments(todayStart, weekEnd, true), // Upcoming: today through end of week
    // Only fetch clients needed for birthdays - limit to current month
    getClients({ birthdayMonth: true }),
    getLoyaltyAccounts({ limit: 5, minPointsBalance: 1 }),
    getStrikes(undefined, { minimal: true }),
    getServices(false, true), // Minimal data for dashboard
    getTasks(todayStart, weekEnd),
    getReminders(todayStart, weekEnd),
    getRecentProjects(5).catch(() => [] as Awaited<ReturnType<typeof getRecentProjects>>),
    getProjectCount().catch(() => 0),
    getBusinessPendingBillsSummary().catch(() => ({ pendingBillsCount: 0, totalPending: 0 })),
  ])
  
  // Only fetch full clients if needed for modals (lazy load)
  let allClientsFull: any[] = []

  const businessStaffId = getSessionStaffId(session)
  const staff = await getUsersForBusinessStaffId(businessStaffId)

  // Todayâ€™s income = confirmed or completed only (not BOOKED / pending approval)
  const todayIncome = todayAppointments
    .filter((apt) => countsTowardRevenueTotal(apt))
    .reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0)
  
  // Also calculate completed income separately for display
  const todayCompleted = todayAppointments.filter(
    (apt) => apt.status === 'COMPLETED'
  )
  const todayCompletedIncome = todayCompleted.reduce(
    (sum, apt) => sum + Number(apt.totalPrice || 0),
    0
  )

  // Clients already filtered for birthday month by getClients
  // Just use them directly (they're already filtered to current month)
  const todayBirthdays = birthdayClients

  // Top loyalty customers already sorted and limited by query
  const topLoyalty = loyaltyAccounts

  // Get clients with strikes
  const strikesByClient = strikeEvents.reduce((acc: any, strike: any) => {
    if (!acc[strike.clientId]) {
      acc[strike.clientId] = {
        client: strike.client,
        totalStrikes: 0,
      }
    }
    acc[strike.clientId].totalStrikes += strike.delta
    return acc
  }, {})

  const strikeClients = Object.values(strikesByClient)
    .sort((a: any, b: any) => b.totalStrikes - a.totalStrikes)
    .slice(0, 5) as any[]

  const openTasks = upcomingTasks.filter(
    (t) => (t as { isCompleted?: boolean }).isCompleted !== true,
  )
  const openReminders = upcomingReminders.filter(
    (r) => (r as { isCompleted?: boolean }).isCompleted !== true,
  )

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Dashboard" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent p-2 sm:p-3">
        <div className="min-h-0 flex-1">
        <Dashboard
          todayAppointments={todayAppointments}
          upcomingAppointments={upcomingAppointments}
          todayIncome={todayIncome}
          todayCompletedIncome={todayCompletedIncome}
          todayBirthdays={todayBirthdays}
          topLoyalty={topLoyalty}
          strikeClients={strikeClients}
          services={services}
          clients={[]}
          staff={staff}
          lowStockItems={lowStockItems}
          upcomingTasks={openTasks}
          upcomingReminders={openReminders}
          recentProjects={recentProjects}
          projectCount={projectCount}
          pendingBillsSummary={pendingBillsSummary}
        />
        </div>
      </div>
    </div>
  )
}

