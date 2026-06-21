import { AppTopbar } from '@/components/app-topbar'
import { ClientProfile } from '@/components/client-profile'
import { getClient, getClients } from '@/app/actions/clients'
import { getClientDisplayName } from '@/lib/utils'
import { getServices } from '@/app/actions/services'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getSessionStaffId } from '@/lib/session-staff'
import { getUsersForBusinessStaffId } from '@/lib/business-users'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  try {
    const [client, services, clients, staff] = await Promise.all([
      getClient(params.id),
      getServices(),
      getClients(),
      getUsersForBusinessStaffId(getSessionStaffId(session)),
    ])
    
    return (
      <>
        <AppTopbar title={getClientDisplayName(client) || 'Client'} />
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-gray-50">
          <ClientProfile client={client} services={services} clients={clients} staff={staff} />
        </div>
      </>
    )
  } catch (error) {
    notFound()
  }
}
