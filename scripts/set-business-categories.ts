/**
 * Sets business categories for existing accounts (so owners don't have to).
 * Run: npx tsx scripts/set-business-categories.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ASSIGNMENTS: { match: string; category: string }[] = [
  { match: 'AR Land Documents', category: 'Consultant' },
  { match: 'Willy C Car Wash', category: 'Car Wash' },
  { match: 'SaSo Pixel Studio', category: 'Designer' },
]

async function main() {
  for (const a of ASSIGNMENTS) {
    const res = await prisma.user.updateMany({
      where: { businessName: { contains: a.match }, ownerUserId: null },
      data: { businessCategory: a.category },
    })
    console.log(`${a.match} -> ${a.category}: updated ${res.count}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
