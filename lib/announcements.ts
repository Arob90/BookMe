import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export type AnnouncementKind = 'IDEA_APPROVED' | 'IDEA_REWARD' | 'SUPPORT_REWARD' | 'GENERIC'

/**
 * Queue a one-time modal for a business owner. Shown next time anyone on that
 * business is in the app, then acknowledged so it doesn't repeat. Best-effort:
 * never throws (a failed announcement must not break the triggering action).
 */
export async function enqueueAnnouncement(input: {
  staffId: string | null | undefined
  kind: AnnouncementKind
  title: string
  body?: string | null
  meta?: Prisma.InputJsonValue
}): Promise<void> {
  if (!input.staffId) return
  try {
    await db.announcement.create({
      data: {
        staffId: input.staffId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        meta: input.meta === undefined ? undefined : input.meta,
      },
    })
  } catch {
    /* best-effort */
  }
}
