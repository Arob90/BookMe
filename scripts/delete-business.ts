/**
 * Permanently delete a business (owner account + all tenant data scoped by
 * staffId = owner id + staff member logins), in FK-safe order, in one transaction.
 *
 * Run: npx tsx scripts/delete-business.ts <ownerEmail> <expectedBusinessName>
 * Both args are required and must match, as a safety guard.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const expectedName = process.argv[3]
  if (!email || !expectedName) {
    console.error('Usage: npx tsx scripts/delete-business.ts <ownerEmail> <expectedBusinessName>')
    process.exit(1)
  }

  const owner = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, businessName: true, ownerUserId: true, role: true },
  })
  if (!owner) { console.error(`No user with email ${email}`); process.exit(1) }
  if (owner.ownerUserId !== null) { console.error('Refusing: this is a STAFF login, not a business owner.'); process.exit(1) }
  if (owner.businessName !== expectedName) {
    console.error(`Refusing: businessName "${owner.businessName}" != expected "${expectedName}"`); process.exit(1)
  }

  const ownerId = owner.id
  const members = await prisma.user.findMany({ where: { ownerUserId: ownerId }, select: { id: true, email: true } })
  console.log(`Deleting business "${owner.businessName}" (owner ${owner.email}, id ${ownerId})`)
  console.log(`Staff logins to be removed (${members.length}):`, members.map(m => m.email))

  const result = await prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {}
    const where = { staffId: ownerId }
    counts.tasks = (await tx.task.deleteMany({ where })).count
    counts.reminders = (await tx.reminder.deleteMany({ where })).count
    counts.projects = (await tx.project.deleteMany({ where })).count        // cascades projectAssignees
    counts.pipelineStages = (await tx.pipelineStage.deleteMany({ where })).count
    counts.clients = (await tx.client.deleteMany({ where })).count          // cascades appts -> apptServices/payments/loyalty/strikes
    counts.appointments = (await tx.appointment.deleteMany({ where })).count // any orphans
    counts.services = (await tx.service.deleteMany({ where })).count        // before categories (Restrict)
    counts.serviceCategories = (await tx.serviceCategory.deleteMany({ where })).count
    counts.inventoryItems = (await tx.inventoryItem.deleteMany({ where })).count
    counts.inventoryCategories = (await tx.inventoryCategory.deleteMany({ where })).count
    counts.paymentAccounts = (await tx.paymentAccount.deleteMany({ where })).count
    counts.holidays = (await tx.holiday.deleteMany({ where })).count
    counts.billingHistory = (await tx.billingHistoryEvent.deleteMany({ where })).count
    counts.settings = (await tx.settings.deleteMany({ where })).count
    // Finally the owner user — cascades members (staff), accounts, sessions, reset tokens, project assignments
    await tx.user.delete({ where: { id: ownerId } })
    counts.ownerUser = 1
    counts.staffMembers = members.length
    return counts
  })

  console.log('✅ Deleted. Row counts:')
  console.table(result)
}

main()
  .catch((e) => { console.error('❌ Deletion failed (transaction rolled back):', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
