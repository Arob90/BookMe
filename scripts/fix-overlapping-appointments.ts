import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Finding and fixing overlapping appointments...')

  // Get all active appointments (not cancelled or no-show)
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    include: {
      client: true,
    },
    orderBy: [
      { staffId: 'asc' },
      { startAt: 'asc' },
    ],
  })

  console.log(`📋 Found ${appointments.length} active appointments`)

  const overlapping: Array<{ first: any; second: any }> = []

  // Check for overlaps - compare each appointment with all others for the same staff
  for (let i = 0; i < appointments.length; i++) {
    const apt1 = appointments[i]
    
    for (let j = i + 1; j < appointments.length; j++) {
      const apt2 = appointments[j]

      // Only check if same staff member
      if (apt1.staffId !== apt2.staffId) {
        continue
      }

      // Check if they overlap: apt1.start < apt2.end AND apt1.end > apt2.start
      const start1 = new Date(apt1.startAt)
      const end1 = new Date(apt1.endAt)
      const start2 = new Date(apt2.startAt)
      const end2 = new Date(apt2.endAt)

      if (start1 < end2 && end1 > start2) {
        overlapping.push({ first: apt1, second: apt2 })
        console.log(`⚠️  Overlap found:`)
        console.log(`   Appointment 1: ${apt1.client.firstName} ${apt1.client.lastName} (Staff: ${apt1.staffId}) - ${start1.toISOString()} to ${end1.toISOString()}`)
        console.log(`   Appointment 2: ${apt2.client.firstName} ${apt2.client.lastName} (Staff: ${apt2.staffId}) - ${start2.toISOString()} to ${end2.toISOString()}`)
      }
    }
  }

  if (overlapping.length === 0) {
    console.log('✅ No overlapping appointments found!')
    return
  }

  console.log(`\n❌ Found ${overlapping.length} overlapping appointment pairs`)
  console.log('🗑️  Removing overlapping appointments (keeping the first one)...')

  const toDelete = new Set<string>()
  
  for (const { first, second } of overlapping) {
    // Keep the first one, delete the second
    // Prefer CONFIRMED over BOOKED
    if (first.status === 'CONFIRMED' && second.status === 'BOOKED') {
      toDelete.add(second.id)
      console.log(`   Keeping: ${first.client.firstName} ${first.client.lastName} (${first.status})`)
      console.log(`   Deleting: ${second.client.firstName} ${second.client.lastName} (${second.status})`)
    } else if (first.status === 'BOOKED' && second.status === 'CONFIRMED') {
      toDelete.add(first.id)
      console.log(`   Keeping: ${second.client.firstName} ${second.client.lastName} (${second.status})`)
      console.log(`   Deleting: ${first.client.firstName} ${first.client.lastName} (${first.status})`)
    } else {
      // Same status, keep the earlier one
      const firstStart = new Date(first.startAt)
      const secondStart = new Date(second.startAt)
      if (firstStart <= secondStart) {
        toDelete.add(second.id)
        console.log(`   Keeping: ${first.client.firstName} ${first.client.lastName} (earlier)`)
        console.log(`   Deleting: ${second.client.firstName} ${second.client.lastName}`)
      } else {
        toDelete.add(first.id)
        console.log(`   Keeping: ${second.client.firstName} ${second.client.lastName} (earlier)`)
        console.log(`   Deleting: ${first.client.firstName} ${first.client.lastName}`)
      }
    }
  }

  // Delete overlapping appointments
  let deleted = 0
  for (const id of toDelete) {
    try {
      await prisma.appointment.delete({
        where: { id },
      })
      deleted++
    } catch (error: any) {
      console.error(`❌ Failed to delete appointment ${id}: ${error.message}`)
    }
  }

  console.log(`\n✅ Deleted ${deleted} overlapping appointments`)
  console.log('✨ Done!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
