import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/authz'
import { AppTopbar } from '@/components/app-topbar'
import { ListingRequestsList } from '@/components/listing-requests-list'
import { getListingRequests } from '@/app/actions/listing-requests'

export const dynamic = 'force-dynamic'

export default async function ListingRequestsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!isSuperAdmin((session.user as { email?: string }).email)) {
    redirect('/app/dashboard')
  }

  let requests: Awaited<ReturnType<typeof getListingRequests>> = []
  try {
    requests = await getListingRequests()
  } catch {
    requests = []
  }

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Listing Requests" />
      <div className="flex-1 overflow-y-auto bg-transparent p-4 lg:p-6">
        <ListingRequestsList initialRequests={requests} />
      </div>
    </div>
  )
}
