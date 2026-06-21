/**
 * Removes the temporary QA admin created by create-test-admin.ts.
 * Run with: npx tsx scripts/delete-test-admin.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const EMAIL = 'testadmin@bookme.bz'

async function main() {
  const deleted = await prisma.user.deleteMany({ where: { email: EMAIL } })
  console.log(`🗑️  Removed ${deleted.count} temporary admin account(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
