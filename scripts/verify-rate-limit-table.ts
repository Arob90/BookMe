/**
 * Verify rate_limit_entries table exists and is usable.
 * Run after: npx prisma generate && npx prisma db push
 * Usage: npx tsx scripts/verify-rate-limit-table.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  try {
    const count = await db.rateLimitEntry.count()
    console.log('OK: rate_limit_entries table exists. Current rows:', count)
    process.exit(0)
  } catch (e: any) {
    if (e.code === 'P2021' || e.message?.includes('rate_limit_entries') || e.message?.includes('does not exist')) {
      console.error('FAIL: rate_limit_entries table missing. Run: npx prisma db push')
      process.exit(1)
    }
    console.error('FAIL:', e.message)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
