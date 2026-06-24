import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppTopbar } from '@/components/app-topbar'
import { NotificationsView } from '@/components/notifications-view'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex h-full flex-col">
      <AppTopbar title="Notifications" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <NotificationsView />
      </div>
    </div>
  )
}
