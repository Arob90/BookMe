import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppTopbar } from '@/components/app-topbar'
import { IdeasBoard } from '@/components/ideas-board'
import { getPublicIdeasBoard, getMyIdeas } from '@/app/actions/ideas'

export const dynamic = 'force-dynamic'

export default async function IdeasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

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
