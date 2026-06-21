import { db } from '../lib/db'

async function main() {
  const users = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'STAFF'] } },
    select: { id: true, email: true, businessName: true, userName: true, role: true },
    orderBy: { email: 'asc' },
  })

  console.log('Existing business login identities:')
  if (users.length === 0) {
    console.log('(none found)')
    return
  }

  for (const u of users) {
    const name = u.businessName || u.userName || '(no name)'
    console.log(`- ${u.email} | ${name} | role=${u.role}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await db.$disconnect()
})
