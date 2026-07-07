import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/authz'
import { AppTopbar } from '@/components/app-topbar'
import { IdeasBoard } from '@/components/ideas-board'
import { IdeasAdmin } from '@/components/ideas-admin'
import { getPublicIdeasBoard, getMyIdeas, getAllIdeas } from '@/app/actions/ideas'

export const dynamic = 'force-dynamic'

export default async function IdeasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isAdmin = isSuperAdmin((session.user as { email?: string })?.email)

  if (isAdmin) {
    const ideas = await getAllIdeas().catch(() => [])
    return (
      <div className="flex flex-col h-full">
        <AppTopbar title="Ideas — Manage" />
        <div className="flex-1 overflow-y-auto bg-transparent p-4 lg:p-6">
          <div className="mx-auto w-full max-w-4xl space-y-4">
            <p className="text-sm text-muted-foreground">
              Review incoming ideas, approve or deny them, then post progress and notes — everything you
              do here shows up on the submitter’s ideas page.
            </p>
            <IdeasAdmin ideas={ideas} />
          </div>
        </div>
      </div>
    )
  }

  const [board, mine] = await Promise.all([
    getPublicIdeasBoard().catch(() => []),
    getMyIdeas().catch(() => []),
  ])

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Bring Your Idea to Life" />
      <div className="flex-1 overflow-y-auto bg-transparent p-4 lg:p-6">
        <IdeasBoard board={board} mine={mine} />
      </div>
    </div>
  )
}
