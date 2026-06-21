import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📅 Adding mock appointments for February 2025...')

  // Get all clients, staff, and services
  const clients = await prisma.client.findMany()
  let staff = await prisma.user.findMany({ where: { role: 'STAFF' } })
  const services = await prisma.service.findMany({ where: { isArchived: false, isActive: true } })

  if (clients.length === 0) {
    console.log('❌ No clients found. Please create clients first.')
    return
  }

  // If no staff, use admin as staff
  if (staff.length === 0) {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (admin) {
      console.log('⚠️  No staff found. Using admin user as staff.')
      staff = [admin]
    } else {
      console.log('❌ No staff or admin found. Please create users first.')
      return
    }
  }

  if (services.length === 0) {
    console.log('❌ No services found. Please create services first.')
    return
  }

  // February 2025 dates
  const february2025 = new Date(2025, 1, 1) // Month is 0-indexed, so 1 = February
  const appointments: Array<{
    clientId: string
    staffId: string
    startAt: Date
    endAt: Date
    serviceIds: string[]
    status: 'BOOKED' | 'CONFIRMED'
    notes?: string
  }> = []

  // Generate appointments for each day in February (28 days in 2025)
  for (let day = 1; day <= 28; day++) {
    const date = new Date(2025, 1, day)
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue
    }

    // Generate 3-5 appointments per day
    const appointmentsPerDay = Math.floor(Math.random() * 3) + 3 // 3-5 appointments

    // Available time slots (9 AM to 5 PM, every hour)
    const timeSlots: number[] = []
    for (let hour = 9; hour <= 16; hour++) {
      timeSlots.push(hour)
    }

    // Shuffle and take appointmentsPerDay slots
    const shuffled = timeSlots.sort(() => Math.random() - 0.5)
    const selectedSlots = shuffled.slice(0, appointmentsPerDay).sort((a, b) => a - b)

    for (const hour of selectedSlots) {
      // Pick random client, staff, and service
      const client = clients[Math.floor(Math.random() * clients.length)]
      const staffMember = staff[Math.floor(Math.random() * staff.length)]
      const service = services[Math.floor(Math.random() * services.length)]

      // Random start minute (0, 15, 30, or 45)
      const minutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)]
      const startAt = new Date(2025, 1, day, hour, minutes)
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000)

      // Random status (70% CONFIRMED, 30% BOOKED)
      const status = Math.random() > 0.3 ? 'CONFIRMED' : 'BOOKED'

      // Check if this time slot conflicts with any existing appointment for this staff
      const hasConflict = appointments.some(apt => {
        return (
          apt.staffId === staffMember.id &&
          apt.startAt < endAt &&
          apt.endAt > startAt
        )
      })

      // Only add if no conflict
      if (!hasConflict) {
        appointments.push({
          clientId: client.id,
          staffId: staffMember.id,
          startAt,
          endAt,
          serviceIds: [service.id],
          status,
          notes: Math.random() > 0.7 ? 'Mock appointment for testing' : undefined,
        })
      }
    }
  }

  console.log(`📝 Creating ${appointments.length} appointments...`)

  // Create appointments one at a time, checking for conflicts each time
  let created = 0
  let skipped = 0

  // Sort appointments by start time to process them in order
  appointments.sort((a, b) => a.startAt.getTime() - b.startAt.getTime())

  for (const apt of appointments) {
    try {
      // Double-check for conflicts in database (more thorough check)
      const conflicting = await prisma.appointment.findFirst({
        where: {
          staffId: apt.staffId,
          AND: [
            { startAt: { lt: apt.endAt } },
            { endAt: { gt: apt.startAt } },
            { status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
          ],
        },
      })

      if (conflicting) {
        console.log(`⚠️  Skipping appointment - conflict with existing appointment for staff ${apt.staffId} at ${apt.startAt.toISOString()}`)
        skipped++
        continue
      }

      // Get service to calculate price
      const service = await prisma.service.findUnique({
        where: { id: apt.serviceIds[0] },
      })

      if (!service) {
        console.log(`⚠️  Skipping appointment - service not found: ${apt.serviceIds[0]}`)
        skipped++
        continue
      }

      const appointment = await prisma.appointment.create({
        data: {
          clientId: apt.clientId,
          staffId: apt.staffId,
          startAt: apt.startAt,
          endAt: apt.endAt,
          status: apt.status,
          totalPrice: service.price,
          notes: apt.notes,
          appointmentServices: {
            create: {
              serviceId: service.id,
              priceAtTime: service.price,
              durationAtTime: service.durationMinutes,
            },
          },
        },
      })

      created++
      if (created % 10 === 0) {
        console.log(`  Progress: ${created}/${appointments.length} created...`)
      }
    } catch (error: any) {
      // Check if it's a conflict error
      if (error.message?.includes('conflict') || error.message?.includes('already has')) {
        console.log(`⚠️  Skipping appointment - conflict detected: ${error.message}`)
      } else {
        console.error(`❌ Failed to create appointment: ${error.message}`)
      }
      skipped++
    }
  }

  console.log(`✅ Created ${created} appointments`)
  if (skipped > 0) {
    console.log(`⚠️  Skipped ${skipped} appointments due to conflicts`)
  }
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
