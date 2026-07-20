import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export type AnnouncementKind = 'IDEA_APPROVED' | 'IDEA_REWARD' | 'SUPPORT_REWARD' | 'GENERIC' | 'WELCOME'

export const WELCOME_ANNOUNCEMENT_TITLE = 'Welcome to BookMe.bz!'
export const WELCOME_ANNOUNCEMENT_BODY =
  "BookMe gives you your own booking page. Clients pick a service and time online, while you manage appointments, payments, loyalty and reports in one app.\n\n" +
  "Thanks for downloading — we hope you enjoy it! If you run into any errors, report them on the Tech Support page. And if there's a feature that would help run your business better, let us know on the Ideas page."

/** Queue the one-time welcome modal for a newly created business owner. */
export async function enqueueWelcomeAnnouncement(staffId: string | null | undefined): Promise<void> {
  await enqueueAnnouncement({
    staffId,
    kind: 'WELCOME',
    title: WELCOME_ANNOUNCEMENT_TITLE,
    body: WELCOME_ANNOUNCEMENT_BODY,
  })
}

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
