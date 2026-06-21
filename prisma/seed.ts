import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seed script – no mock/demo data.
 * Run with: npx tsx prisma/seed.ts (or npm run db:seed)
 * Creates default settings singleton only if missing (for migrations). No demo users.
 */
async function main() {
  console.log('🌱 Running seed (no mock data)...')

  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      businessHours: {
        MONDAY: { start: '09:00', end: '18:00' },
        TUESDAY: { start: '09:00', end: '18:00' },
        WEDNESDAY: { start: '09:00', end: '18:00' },
        THURSDAY: { start: '09:00', end: '18:00' },
        FRIDAY: { start: '09:00', end: '18:00' },
        SATURDAY: { start: '09:00', end: '18:00' },
        SUNDAY: { start: '09:00', end: '18:00' },
      },
      loyaltyEarnMode: 'PER_DOLLAR',
      loyaltyPointsPerDollar: 1.0,
      strikeLateCancel: 1,
      strikeNoShow: 2,
      strikeExpirationDays: 90,
      strikeThreshold: 3,
      strikeThresholdAction: 'REQUIRES_DEPOSIT',
    },
  })
  console.log('✅ Default settings singleton ensured')

  console.log('✨ Seed complete. No demo users created.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
