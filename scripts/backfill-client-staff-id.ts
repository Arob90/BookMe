/**
 * Restore tenant scoping for clients created before `clients.staff_id` existed.
 *
 * 1) From appointments: for each client with staff_id null, set staff_id to the
 *    business owner id derived from their earliest appointment (team → owner).
 * 2) Optional: assign CRM-only rows (null staff_id, no appointments anywhere)
 *    to one owner — only when you pass flags (see below).
 *
 * Usage:
 *   npx tsx scripts/backfill-client-staff-id.ts
 *   npx tsx scripts/backfill-client-staff-id.ts --orphans-for-email=sasoandco.ltd@gmail.com --confirm=ASSIGN_ORPHANS
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resolveOwnerId(schedulingUserId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: schedulingUserId },
    select: { ownerUserId: true },
  })
  if (!u) return schedulingUserId
  return u.ownerUserId ?? schedulingUserId
}

async function backfillFromAppointments(): Promise<number> {
  const clients = await prisma.client.findMany({
    where: { staffId: null },
    select: { id: true },
  })
  let updated = 0
  for (const c of clients) {
    const apt = await prisma.appointment.findFirst({
      where: { clientId: c.id },
      orderBy: { startAt: 'asc' },
      select: { staffId: true },
    })
    if (!apt) continue
    const ownerId = await resolveOwnerId(apt.staffId)
    await prisma.client.update({
      where: { id: c.id },
      data: { staffId: ownerId },
    })
    updated++
  }
  return updated
}

async function backfillOrphansForOwnerEmail(email: string): Promise<number> {
  const owner = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      ownerUserId: null,
    },
    select: { id: true, email: true },
  })
  if (!owner) {
    throw new Error(`No owner account (owner_user_id IS NULL) found for email: ${email}`)
  }

  const orphans = await prisma.client.findMany({
    where: {
      staffId: null,
      appointments: { none: {} },
    },
    select: { id: true },
  })

  if (orphans.length === 0) return 0

  for (const o of orphans) {
    await prisma.client.update({
      where: { id: o.id },
      data: { staffId: owner.id },
    })
  }
  return orphans.length
}

function parseArgs() {
  const args = process.argv.slice(2)
  let orphansEmail: string | undefined
  let confirm: string | undefined
  for (const a of args) {
    if (a.startsWith('--orphans-for-email=')) {
      orphansEmail = a.slice('--orphans-for-email='.length).trim()
    }
    if (a.startsWith('--confirm=')) {
      confirm = a.slice('--confirm='.length).trim()
    }
  }
  return { orphansEmail, confirm }
}

async function main() {
  const { orphansEmail, confirm } = parseArgs()

  console.log('Pass 1: set staff_id from appointments (null → owner of booking business)…')
  const n = await backfillFromAppointments()
  console.log(`  Updated ${n} client row(s).`)

  if (orphansEmail) {
    if (confirm !== 'ASSIGN_ORPHANS') {
      console.error(
        '\nRefusing orphan assignment without --confirm=ASSIGN_ORPHANS\n' +
          'This assigns EVERY client with staff_id null and zero appointments to that owner.\n' +
          'Only use if you are sure no other business has such rows in this database.\n'
      )
      process.exit(1)
    }
    console.log(
      `\nPass 2: assigning CRM-only clients (no appointments) to owner ${orphansEmail}…`
    )
    const m = await backfillOrphansForOwnerEmail(orphansEmail)
    console.log(`  Assigned ${m} orphan client row(s).`)
  } else {
    const stillNull = await prisma.client.count({ where: { staffId: null } })
    if (stillNull > 0) {
      console.log(
        `\nNote: ${stillNull} client(s) still have staff_id null (usually no appointments).` +
          `\nTo attach them to SaSo (or another owner), run:\n` +
          `  npx tsx scripts/backfill-client-staff-id.ts --orphans-for-email=YOUR_OWNER_EMAIL --confirm=ASSIGN_ORPHANS\n`
      )
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
