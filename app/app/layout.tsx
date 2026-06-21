import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
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

  return (
    <SessionProvider session={session}>
      <SyncListener />
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden lg:ml-64 w-full">
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
