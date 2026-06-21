import { AppTopbar } from '@/components/app-topbar'
import { ClientsList } from '@/components/clients-list'
import { getClients } from '@/app/actions/clients'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { search?: string; filter?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const filters: any = {}
  if (searchParams.search) filters.search = searchParams.search
  if (searchParams.filter === 'individual') filters.type = 'INDIVIDUAL'
  if (searchParams.filter === 'company') filters.type = 'COMPANY'
  if (searchParams.filter === 'birthday') filters.birthdayMonth = true
  if (searchParams.filter === 'strikes') filters.hasStrikes = true
  if (searchParams.filter === 'vip') filters.vip = true

  const clients = await getClients(filters)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppTopbar title="Clients" />
      <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4 bg-transparent flex flex-col">
        <ClientsList initialClients={clients} />
      </div>
    </div>
  )
}

