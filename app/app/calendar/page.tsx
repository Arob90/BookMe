import { AppTopbar } from '@/components/app-topbar'
import CalendarView from '@/components/calendar-view'
import { getAppointments } from '@/app/actions/appointments'
import { getServices } from '@/app/actions/services'
import { getClients } from '@/app/actions/clients'
import { getTasks } from '@/app/actions/tasks'
import { getReminders } from '@/app/actions/reminders'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSessionStaffId } from '@/lib/session-staff'
import { getUsersForBusinessStaffId } from '@/lib/business-users'
import { startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { date?: string; appointmentId?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const now = new Date()
  // Wide window so month navigation and tasks/reminders with due dates outside "this month" still load.
  const fetchStart = startOfMonth(subMonths(now, 6))
  const fetchEnd = endOfMonth(addMonths(now, 6))
  fetchStart.setHours(0, 0, 0, 0)
  fetchEnd.setHours(23, 59, 59, 999)

  const [appointments, services, clients, tasks, reminders] = await Promise.all([
    getAppointments(fetchStart, fetchEnd, true),
    getServices(),
    // Fetch all clients so dropdown includes everyone (not just those with existing appointments)
    getClients(),
    getTasks(fetchStart, fetchEnd),
    getReminders(fetchStart, fetchEnd),
  ])

  const staff = await getUsersForBusinessStaffId(getSessionStaffId(session))

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Calendar" />
      <div className="flex-1 overflow-hidden p-2 sm:p-3 bg-transparent">
        <CalendarView 
          initialAppointments={appointments}
          initialTasks={tasks}
          initialReminders={reminders}
          services={services}
          clients={clients}
          staff={staff}
          initialDate={searchParams.date}
          initialAppointmentId={searchParams.appointmentId}
        />
      </div>
    </div>
  )
}

