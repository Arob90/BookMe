/**
 * Creates (or resets) a TEMPORARY owner admin for design/QA verification.
 * Safe to delete afterwards: `npx tsx scripts/delete-test-admin.ts`
 * Run with: npx tsx scripts/create-test-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const EMAIL = 'testadmin@bookme.bz'
const PASSWORD = 'TestAdmin#2026'

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, isPaused: false },
    create: {
      email: EMAIL,
      passwordHash,
      role: 'ADMIN',
      userName: 'Test Admin',
      firstName: 'Test',
      lastName: 'Admin',
      businessName: 'BookMe QA',
      district: 'BELIZE',
      ownerUserId: null,
    },
  })
  console.log('✅ Temporary admin ready:')
  console.log('   email:   ', EMAIL)
  console.log('   password:', PASSWORD)
  console.log('   id:      ', user.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
