const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function main() {
  const emails = ['sales@nailsbynikz.com', 'nailsbynikz@gmail.com', 'sasoandco.ltd@gmail.com']
  const users = await db.user.findMany({
    where: { email: { in: emails } },
    select: {
      id: true,
      email: true,
      role: true,
      ownerUserId: true,
      businessName: true,
      district: true,
      isPaused: true,
      createdAt: true,
    },
  })
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })

