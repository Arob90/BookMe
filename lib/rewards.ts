import { db } from '@/lib/db'
import { computeFreeDaysDate } from '@/lib/subscription'
import { BillingHistoryEventType, recordBillingHistoryEvent } from '@/lib/billing-history'

/**
 * Grant `days` of free subscription time to a business.
 *
 * Extends the owner's `subscriptionEndsAt` (from the current expiry if still in
 * the future, otherwise from now). Because sign-in for the whole business is
 * gated by the owner's expiry date, this automatically covers every team login
 * too — no per-staff action needed.
 */
export async function grantFreeDaysToBusiness(input: {
  ownerId: string
  days: number
  reason?: string
  actorUserId?: string | null
}): Promise<{ ok: true; subscriptionEndsAt: string; days: number }> {
  const { ownerId, days, reason, actorUserId } = input
  if (!ownerId) throw new Error('Missing business account')
  if (!Number.isFinite(days) || days <= 0) throw new Error('Free days must be a positive number')

  const owner = await db.user.findFirst({
    where: { id: ownerId, ownerUserId: null },
    select: { id: true, subscriptionEndsAt: true },
  })
  if (!owner) throw new Error('Business account not found (must be a business owner, not a team login)')

  const newEnd = computeFreeDaysDate(owner.subscriptionEndsAt, days)
  await db.user.update({ where: { id: ownerId }, data: { subscriptionEndsAt: newEnd } })

  await recordBillingHistoryEvent({
    staffId: ownerId,
    eventType: BillingHistoryEventType.FREE_DAYS_GRANTED,
    title: `${days} free day${days === 1 ? '' : 's'} granted`,
    detail: `${reason ? `${reason} — ` : ''}Subscription extended to ${newEnd.toDateString()}. Applies to the whole business (owner + team).`,
    metadata: { days, reason: reason ?? null, to: newEnd.toISOString() },
    actorUserId: actorUserId ?? null,
  })

  return { ok: true as const, subscriptionEndsAt: newEnd.toISOString(), days }
}
