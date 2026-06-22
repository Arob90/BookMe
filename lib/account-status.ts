import { db } from '@/lib/db'

export interface AccountLockState {
  locked: boolean
  planStatus: string
  trialEndsAt: Date | null
  /** Whole days remaining in the trial (>= 0), or null when not trialing. */
  daysLeft: number | null
}

const MS_PER_DAY = 86_400_000

/**
 * Computes whether a business is locked out because its 14-day free trial ended
 * without moving to a paid plan. Default-safe: any error or missing data → unlocked.
 */
export async function getAccountLockState(ownerId: string): Promise<AccountLockState> {
  let row: { planStatus: string | null; trialEndsAt: Date | null } | null = null
  try {
    row = await db.settings.findUnique({
      where: { staffId: ownerId },
      select: { planStatus: true, trialEndsAt: true },
    })
  } catch {
    // Older Prisma client without the new fields — treat as active.
    return { locked: false, planStatus: 'active', trialEndsAt: null, daysLeft: null }
  }

  const planStatus = row?.planStatus ?? 'active'
  const trialEndsAt = row?.trialEndsAt ?? null

  if (planStatus !== 'trialing' || !trialEndsAt) {
    return { locked: false, planStatus, trialEndsAt, daysLeft: null }
  }

  const remaining = trialEndsAt.getTime() - Date.now()
  const locked = remaining <= 0
  return {
    locked,
    planStatus,
    trialEndsAt,
    daysLeft: locked ? 0 : Math.ceil(remaining / MS_PER_DAY),
  }
}
