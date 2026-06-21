/**
 * Reset a user's password by email.
 * Run: npx tsx scripts/reset-owner-password.ts <email> <newPassword>
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]
  if (!email || !newPassword) {
    console.error('Usage: npx tsx scripts/reset-owner-password.ts <email> <newPassword>')
    process.exit(1)
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, businessName: true } })
  if (!user) {
    console.error(`No user found with email ${email}`)
    process.exit(1)
  }
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { email }, data: { passwordHash } })
  console.log(`✅ Password reset for ${user.email} (${user.businessName ?? 'no business name'})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
