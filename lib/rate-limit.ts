/**
 * Production rate limiting using the database (shared across instances, survives restarts).
 * Uses Prisma + RateLimitEntry table. Run: npx prisma db push (or migrate) to create the table.
 */

import { db } from '@/lib/db'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + WINDOW_MS)

  try {
    const existing = await db.rateLimitEntry.findUnique({
      where: { key: identifier },
    })

    if (!existing) {
      await db.rateLimitEntry.create({
        data: {
          key: identifier,
          count: 1,
          resetAt: windowEnd,
        },
      })
      return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
    }

    if (now >= existing.resetAt) {
      // Window expired, reset
      await db.rateLimitEntry.update({
        where: { key: identifier },
        data: { count: 1, resetAt: windowEnd },
      })
      return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
    }

    if (existing.count >= MAX_ATTEMPTS) {
      return { allowed: false, remaining: 0 }
    }

    await db.rateLimitEntry.update({
      where: { key: identifier },
      data: { count: { increment: 1 } },
    })

    return { allowed: true, remaining: MAX_ATTEMPTS - existing.count - 1 }
  } catch (error) {
    // If table doesn't exist or DB error, allow the request (fail open for availability)
    console.error('[rate-limit] Error:', error)
    return { allowed: true, remaining: MAX_ATTEMPTS }
  }
}

export async function resetRateLimit(identifier: string): Promise<void> {
  try {
    await db.rateLimitEntry.deleteMany({ where: { key: identifier } })
  } catch {
    // Ignore
  }
}

/**
 * Optional: call periodically to delete expired rows (e.g. from a cron job).
 * Not required for correctness; expired windows are reset on next check.
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const result = await db.rateLimitEntry.deleteMany({
      where: { resetAt: { lt: new Date() } },
    })
    return result.count
  } catch {
    return 0
  }
}
