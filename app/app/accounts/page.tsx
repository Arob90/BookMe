import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/authz'
import { AppTopbar } from '@/components/app-topbar'
import { AccountsAdminTabs } from '@/components/accounts-admin-tabs'
import { getPendingAccountRequests } from '@/app/actions/account-requests'
import { getAllManagedUsers } from '@/app/actions/account-admin'
import { db } from '@/lib/db'
import { getSessionStaffId } from '@/lib/session-staff'
import type { PendingApproval } from '@/components/pending-approvals-list'

export const dynamic = 'force-dynamic'

type AccountsPageProps = {
  searchParams: { tab?: string }
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  if (!isSuperAdmin((session.user as { email?: string }).email)) {
    redirect('/app/dashboard')
  }

  let requests: Awaited<ReturnType<typeof getPendingAccountRequests>> = []
  try {
    requests = await getPendingAccountRequests()
  } catch {
    requests = []
  }

  let users: Awaited<ReturnType<typeof getAllManagedUsers>> = []
  try {
    users = await getAllManagedUsers()
  } catch (e) {
    console.error('[AccountsPage] getAllManagedUsers failed:', e)
    users = []
  }

  let approvals: PendingApproval[] = []
  try {
    const pendingAppointments = await db.appointment.findMany({
      where: {
        status: 'BOOKED',
        source: 'PUBLIC_BOOKING',
        staffId: getSessionStaffId(session),
      },
      include: {
        client: {
          select: { firstName: true, lastName: true },
        },
        appointmentServices: {
          include: {
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { startAt: 'asc' },
    })

    approvals = pendingAppointments.map((a) => ({
      id: a.id,
      client: a.client as { firstName: string; lastName: string },
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      totalPrice: a.totalPrice ? Number(a.totalPrice) : 0,
      appointmentServices: a.appointmentServices.map((x) => ({
        service: { name: x.service?.name ?? 'Service' },
      })),
    }))
  } catch {
    approvals = []
  }

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Account Management" />
      <div className="flex-1 overflow-y-auto bg-transparent p-4 lg:p-6">
        <AccountsAdminTabs
          defaultTab={searchParams.tab}
          users={users}
          approvals={approvals}
          requests={requests.map((r) => ({
            id: r.id,
            email: r.email,
            businessName: r.businessName,
            district: r.district,
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.phone,
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
            paymentStatus: (r as { paymentStatus?: string | null }).paymentStatus ?? null,
            paymentProofUrl: (r as { paymentProofUrl?: string | null }).paymentProofUrl ?? null,
            paymentSubmittedAt: (r as { paymentSubmittedAt?: Date | null }).paymentSubmittedAt
              ? new Date((r as { paymentSubmittedAt: Date }).paymentSubmittedAt).toISOString()
              : null,
          }))}
        />
      </div>
    </div>
  )
}

