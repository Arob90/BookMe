/**
 * Read-only inspection: shows owner accounts and the full data footprint
 * (by staffId = owner id) for the businesses we care about.
 * Run: npx tsx scripts/inspect-business.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TARGET_NAMES = ['SaSo Pixel Studio', 'Nails by Nikz']

async function footprint(ownerId: string) {
  const [
    clients, services, categories, appts, payments, inventory, invCats,
    paymentAccounts, holidays, stages, projects, tasks, reminders, billing, settings, members,
  ] = await Promise.all([
    prisma.client.count({ where: { staffId: ownerId } }),
    prisma.service.count({ where: { staffId: ownerId } }),
    prisma.serviceCategory.count({ where: { staffId: ownerId } }),
    prisma.appointment.count({ where: { staffId: ownerId } }),
    prisma.payment.count({ where: { client: { staffId: ownerId } } }),
    prisma.inventoryItem.count({ where: { staffId: ownerId } }),
    prisma.inventoryCategory.count({ where: { staffId: ownerId } }),
    prisma.paymentAccount.count({ where: { staffId: ownerId } }),
    prisma.holiday.count({ where: { staffId: ownerId } }),
    prisma.pipelineStage.count({ where: { staffId: ownerId } }),
    prisma.project.count({ where: { staffId: ownerId } }),
    prisma.task.count({ where: { staffId: ownerId } }),
    prisma.reminder.count({ where: { staffId: ownerId } }),
    prisma.billingHistoryEvent.count({ where: { staffId: ownerId } }),
    prisma.settings.count({ where: { staffId: ownerId } }),
    prisma.user.count({ where: { ownerUserId: ownerId } }),
  ])
  return { clients, appts, payments, services, categories, inventory, invCats, paymentAccounts, holidays, stages, projects, tasks, reminders, billing, settings, staffMembers: members }
}

async function main() {
  for (const name of TARGET_NAMES) {
    const owners = await prisma.user.findMany({
      where: { businessName: name, ownerUserId: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, district: true, isPaused: true, createdAt: true },
    })
    console.log('\n==============================')
    console.log(`Business: ${name}`)
    if (owners.length === 0) {
      console.log('  (no owner account found with this exact businessName)')
      // also show any users (incl. staff) carrying this name
      const any = await prisma.user.findMany({ where: { businessName: name }, select: { id: true, email: true, role: true, ownerUserId: true } })
      console.log('  users with this businessName (any role):', any)
      continue
    }
    for (const o of owners) {
      console.log('  Owner:', { id: o.id, email: o.email, name: `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim(), role: o.role, district: o.district, isPaused: o.isPaused })
      const fp = await footprint(o.id)
      console.log('  Data footprint (would be deleted):')
      console.table(fp)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
