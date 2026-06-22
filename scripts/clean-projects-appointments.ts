/**
 * Delete ALL projects and ALL appointments for one business (by owner email),
 * keeping clients, services, settings, etc. Runs in a transaction with a guard.
 *
 * Run: npx tsx scripts/clean-projects-appointments.ts <ownerEmail> <expectedBusinessName>
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const expectedName = process.argv[3]
  if (!email || !expectedName) {
    console.error('Usage: npx tsx scripts/clean-projects-appointments.ts <ownerEmail> <expectedBusinessName>')
    process.exit(1)
  }
  const owner = await prisma.user.findUnique({
    where: { email },
    select: { id: true, businessName: true, ownerUserId: true },
  })
  if (!owner) { console.error(`No user with email ${email}`); process.exit(1) }
  if (owner.ownerUserId !== null) { console.error('Refusing: not a business owner.'); process.exit(1) }
  if (owner.businessName !== expectedName) {
    console.error(`Refusing: businessName "${owner.businessName}" != "${expectedName}"`); process.exit(1)
  }
  const ownerId = owner.id

  const before = {
    projects: await prisma.project.count({ where: { staffId: ownerId } }),
    appointments: await prisma.appointment.count({ where: { staffId: ownerId } }),
  }
  console.log(`Business "${owner.businessName}" — before:`, before)

  const result = await prisma.$transaction(async (tx) => {
    // Projects (cascades project_assignees). Pipeline stages are kept.
    const projects = (await tx.project.deleteMany({ where: { staffId: ownerId } })).count
    // Appointments cascade appointment_services + payments; null out task/reminder/loyalty/strike links.
    const appointments = (await tx.appointment.deleteMany({ where: { staffId: ownerId } })).count
    return { projects, appointments }
  })

  console.log('✅ Deleted:', result)
  console.log('After:', {
    projects: await prisma.project.count({ where: { staffId: ownerId } }),
    appointments: await prisma.appointment.count({ where: { staffId: ownerId } }),
    clientsKept: await prisma.client.count({ where: { staffId: ownerId } }),
    servicesKept: await prisma.service.count({ where: { staffId: ownerId } }),
  })
}

main()
  .catch((e) => { console.error('❌ Failed (rolled back):', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
