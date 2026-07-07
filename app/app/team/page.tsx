import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Team & Permissions moved into Settings (it's the owner's own team/personal info).
 * Keep this route as a redirect so old links/bookmarks land on the new tab.
 */
export default function TeamPage() {
  redirect('/app/settings?tab=team')
}
