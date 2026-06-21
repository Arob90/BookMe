import { AppTopbar } from '@/components/app-topbar'
import { ServicesList } from '@/components/services-list'
import { getServices, getCategories, reconcileServiceStaffIds } from '@/app/actions/services'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: { view?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const includeArchived = searchParams.view === 'archived'
  await reconcileServiceStaffIds().catch(() => {})
  const [services, categories] = await Promise.all([
    getServices(includeArchived),
    getCategories(),
  ])

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Services" />
      <div className="flex-1 overflow-hidden p-3 sm:p-4 bg-transparent">
        <ServicesList initialServices={services} initialCategories={categories} view={searchParams.view} />
      </div>
    </div>
  )
}

