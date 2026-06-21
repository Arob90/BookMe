/**
 * Website bookings start as BOOKED + PUBLIC_BOOKING until the business approves (CONFIRMED).
 * Stats like "today's income" should not count them as real revenue until then.
 */
export function isPendingPublicWebsiteBooking(apt: {
  status?: string
  source?: string | null
}): boolean {
  return apt.status === 'BOOKED' && apt.source === 'PUBLIC_BOOKING'
}

/**
 * Dashboard “income” should only include appointments you’ve accepted as real work
 * (confirmed) or already completed — not raw BOOKED holds (including internal drafts).
 */
export function countsTowardRevenueTotal(apt: { status?: string }): boolean {
  return apt.status === 'CONFIRMED' || apt.status === 'COMPLETED'
}
