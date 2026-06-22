import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/authz'
import { getAccountLockState } from '@/lib/account-status'
import { AppSidebar } from '@/components/app-sidebar'
import { SessionProvider } from '@/components/session-provider'
import { SyncListener } from '@/components/sync-listener'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session = null
  try {
    // Add timeout to prevent hanging
    session = await Promise.race([
      getServerSession(authOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout')), 5000)
      )
    ]) as any
  } catch (error: any) {
    console.error('Session error in app layout:', error.message)
    // If database error, redirect to login
    redirect('/login')
  }

  if (!session) {
    redirect('/login')
  }

  try {
    const row = await db.user.findUnique({
      where: { id: session.user.id },
      select: { isPaused: true },
    })
    if (row?.isPaused === true) {
      redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent('/login?paused=1')}`)
    }
  } catch {
    /* Prisma client without isPaused — skip */
  }

  // 14-day free trial enforcement. Super admins are never locked.
  const ownerId: string = session.user.businessStaffId || session.user.id
  const isSuper = isSuperAdmin(session.user.email)
  const pathname = headers().get('x-pathname') || ''
  const lock = await getAccountLockState(ownerId)

  if (lock.locked && !isSuper) {
    // Trial ended: the only reachable screen is the "choose a plan" page,
    // rendered bare (no app shell) until an admin activates a plan.
    if (!pathname.startsWith('/app/billing')) {
      redirect('/app/billing')
    }
    return <SessionProvider session={session}>{children}</SessionProvider>
  }

  const showTrialBanner = lock.planStatus === 'trialing' && lock.daysLeft != null

  return (
    <SessionProvider session={session}>
      <SyncListener />
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden lg:ml-[var(--sidebar-w)] w-full transition-[margin] duration-300">
          {showTrialBanner && (
            <Link
              href="/app/billing"
              className="flex-shrink-0 flex flex-wrap items-center justify-center gap-x-2 bg-pink-500 text-white text-xs sm:text-sm font-medium px-4 py-1.5 hover:bg-pink-600 transition-colors"
            >
              <span>
                {lock.daysLeft === 0
                  ? 'Your free trial ends today'
                  : `${lock.daysLeft} day${lock.daysLeft === 1 ? '' : 's'} left in your free trial`}
              </span>
              <span className="underline underline-offset-2">Choose a plan →</span>
            </Link>
          )}
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
