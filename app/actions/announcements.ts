'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { db } from '@/lib/db'

export type PendingAnnouncement = {
  id: string
  kind: string
  title: string
  body: string | null
  meta: Record<string, unknown> | null
}

/** Unacknowledged modals for the current business (oldest first). */
export async function getPendingAnnouncements(): Promise<PendingAnnouncement[]> {
  const session = await getServerSession(authOptions)
  const staffId = session ? getSessionStaffId(session) : null
  if (!staffId) return []
  try {
    const rows = await db.announcement.findMany({
      where: { staffId, acknowledgedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })
    return rows.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      body: a.body ?? null,
      meta: (a.meta as Record<string, unknown> | null) ?? null,
    }))
  } catch {
    return []
  }
}

/** Mark a modal as seen so it won't show again. Scoped to the caller's business. */
export async function acknowledgeAnnouncement(id: string): Promise<{ ok: true }> {
  const session = await getServerSession(authOptions)
  const staffId = session ? getSessionStaffId(session) : null
  if (!staffId) return { ok: true as const }
  try {
    await db.announcement.updateMany({
      where: { id, staffId, acknowledgedAt: null },
      data: { acknowledgedAt: new Date() },
    })
  } catch {
    /* ignore */
  }
  return { ok: true as const }
}
