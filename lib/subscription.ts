/**
 * Subscription expiry helpers for business accounts.
 *
 * The expiry date lives on the owner User row (`subscriptionEndsAt`). A `null`
 * value means no expiry is tracked (treated as unlimited / active). When the
 * date is in the past the business is expired and sign-in is blocked until an
 * admin renews it.
 */

/** Accounts within this many days of expiry are flagged "expiring soon". */
export const SUBSCRIPTION_WARN_DAYS = 14

export type SubscriptionStatus = 'none' | 'active' | 'expiring' | 'expired'

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Whole days from `now` until `endsAt` (negative if already past). */
export function daysUntil(endsAt: Date, now: Date = new Date()): number {
  return Math.ceil((endsAt.getTime() - now.getTime()) / MS_PER_DAY)
}

export function getSubscriptionStatus(
  endsAt: Date | string | null | undefined,
  now: Date = new Date()
): SubscriptionStatus {
  if (!endsAt) return 'none'
  const end = typeof endsAt === 'string' ? new Date(endsAt) : endsAt
  if (Number.isNaN(end.getTime())) return 'none'
  if (end.getTime() <= now.getTime()) return 'expired'
  if (daysUntil(end, now) <= SUBSCRIPTION_WARN_DAYS) return 'expiring'
  return 'active'
}

/** True when the subscription has lapsed (used to block sign-in). */
export function isSubscriptionExpired(
  endsAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  return getSubscriptionStatus(endsAt, now) === 'expired'
}

/**
 * Add whole months to a base date, clamping to the end of shorter months.
 * Used by the "add N months" quick-renew buttons.
 */
export function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime())
  const targetMonth = d.getMonth() + months
  d.setMonth(targetMonth)
  // If the day rolled over (e.g. Jan 31 + 1mo), clamp back to the last day.
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0)
  }
  return d
}

/**
 * Compute a new expiry when renewing by `months`. Extends from the current
 * expiry if it is still in the future (so time isn't lost); otherwise from now.
 */
export function computeRenewalDate(
  currentEndsAt: Date | string | null | undefined,
  months: number,
  now: Date = new Date()
): Date {
  const current = currentEndsAt
    ? typeof currentEndsAt === 'string'
      ? new Date(currentEndsAt)
      : currentEndsAt
    : null
  const base = current && current.getTime() > now.getTime() ? current : now
  return addMonths(base, months)
}
