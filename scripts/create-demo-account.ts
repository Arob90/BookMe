/**
 * Creates (or re-seeds) a demo business account "Client Demo" with realistic mock data
 * so the app can be tested end-to-end. Safe to re-run: wipes the demo tenant's data first.
 *
 * Login after running:  democlient@bookme.bz  /  Demo#2026
 * Remove later with:     npx tsx scripts/delete-business.ts democlient@bookme.bz "Client Demo"
 *
 * Run: npx tsx scripts/create-demo-account.ts
 */
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const EMAIL = 'democlient@bookme.bz'
const PASSWORD = 'Demo#2026'
const BUSINESS = 'Client Demo'

function daysFromNow(d: number, hour = 10, min = 0) {
  const x = new Date()
  x.setDate(x.getDate() + d)
  x.setHours(hour, min, 0, 0)
  return x
}
function ymdNoonUtc(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

async function wipeTenant(ownerId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { staffId: ownerId } })
    await tx.reminder.deleteMany({ where: { staffId: ownerId } })
    await tx.project.deleteMany({ where: { staffId: ownerId } })
    await tx.pipelineStage.deleteMany({ where: { staffId: ownerId } })
    await tx.client.deleteMany({ where: { staffId: ownerId } }) // cascades appts -> services/payments/loyalty/strikes
    await tx.appointment.deleteMany({ where: { staffId: ownerId } })
    await tx.service.deleteMany({ where: { staffId: ownerId } })
    await tx.serviceCategory.deleteMany({ where: { staffId: ownerId } })
    await tx.inventoryItem.deleteMany({ where: { staffId: ownerId } })
    await tx.inventoryCategory.deleteMany({ where: { staffId: ownerId } })
    await tx.paymentAccount.deleteMany({ where: { staffId: ownerId } })
    await tx.holiday.deleteMany({ where: { staffId: ownerId } })
  })
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  const owner = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, isPaused: false },
    create: {
      email: EMAIL, passwordHash, role: 'ADMIN', userName: 'Demo Owner',
      firstName: 'Demo', lastName: 'Owner', businessName: BUSINESS, district: 'BELIZE', ownerUserId: null,
    },
  })
  const ownerId = owner.id
  console.log('Owner ready:', ownerId)
  await wipeTenant(ownerId)

  // Settings
  await prisma.settings.upsert({
    where: { staffId: ownerId },
    update: {},
    create: {
      staffId: ownerId, maxUsers: 5, currency: 'USD', currencySymbol: '$', timezone: 'America/Belize',
      businessHours: {
        MONDAY: { start: '09:00', end: '18:00' }, TUESDAY: { start: '09:00', end: '18:00' },
        WEDNESDAY: { start: '09:00', end: '18:00' }, THURSDAY: { start: '09:00', end: '18:00' },
        FRIDAY: { start: '09:00', end: '18:00' }, SATURDAY: { start: '09:00', end: '15:00' },
      },
    },
  })

  // Service categories (name is globally unique — prefix to avoid collisions) + services
  const catData = [
    { key: 'Hair', label: 'Hair', services: [['Haircut & Style', 60, 45], ['Color & Highlights', 120, 130], ['Blow Dry', 30, 25]] },
    { key: 'Nails', label: 'Nails', services: [['Classic Manicure', 45, 30], ['Gel Manicure', 60, 45], ['Pedicure', 60, 50]] },
    { key: 'Spa', label: 'Spa', services: [['Facial', 60, 75], ['Massage (60 min)', 60, 90]] },
  ]
  const serviceByName: Record<string, { id: string; price: number; dur: number }> = {}
  for (let ci = 0; ci < catData.length; ci++) {
    const c = catData[ci]
    const cat = await prisma.serviceCategory.create({
      data: { name: `${BUSINESS} – ${c.label}`, staffId: ownerId, sortOrder: ci },
    })
    for (const [name, dur, price] of c.services as [string, number, number][]) {
      const svc = await prisma.service.create({
        data: {
          name, categoryId: cat.id, staffId: ownerId, durationMinutes: dur,
          price: new Prisma.Decimal(price), colorTag: ['blue', 'pink', 'green'][ci % 3], isActive: true,
        },
      })
      serviceByName[name] = { id: svc.id, price, dur }
    }
  }

  // Clients
  const clientSeed = [
    ['Maria', 'Lopez', '+501-610-1111', 'maria.lopez@example.com', ymdNoonUtc(1990, 4, 12), ['VIP']],
    ['James', 'Wright', '+501-610-2222', 'james.w@example.com', ymdNoonUtc(1985, 9, 3), []],
    ['Aaliyah', 'Chen', '+501-610-3333', 'aaliyah.chen@example.com', ymdNoonUtc(1996, 6, 21), ['New']],
    ['Diego', 'Martinez', '+501-610-4444', 'diego.m@example.com', ymdNoonUtc(1979, 1, 30), []],
    ['Sophie', 'Brown', '+501-610-5555', 'sophie.b@example.com', ymdNoonUtc(2000, 11, 8), ['VIP']],
    ['Liam', 'Garcia', '+501-610-6666', 'liam.g@example.com', ymdNoonUtc(1992, 7, 17), []],
    ['Nadia', 'Patel', '+501-610-7777', 'nadia.p@example.com', ymdNoonUtc(1988, 3, 25), ['Regular']],
    ['Owen', 'Reyes', '+501-610-8888', 'owen.r@example.com', ymdNoonUtc(1995, 12, 1), []],
  ] as const
  const clients: { id: string; name: string }[] = []
  for (const [first, last, phone, email, birthday, tags] of clientSeed) {
    const cl = await prisma.client.create({
      data: { staffId: ownerId, type: 'INDIVIDUAL', firstName: first, lastName: last, phone, email, birthday, tags: [...tags] },
    })
    clients.push({ id: cl.id, name: `${first} ${last}` })
    await prisma.loyaltyAccount.create({ data: { clientId: cl.id, pointsBalance: Math.floor(Math.random() * 120) } })
  }

  // Appointments: a mix of past (completed, paid) and upcoming (booked/confirmed)
  const svcNames = Object.keys(serviceByName)
  const plan = [
    { day: -14, svc: 'Haircut & Style', status: 'COMPLETED', ci: 0 },
    { day: -10, svc: 'Gel Manicure', status: 'COMPLETED', ci: 1 },
    { day: -7, svc: 'Facial', status: 'COMPLETED', ci: 2 },
    { day: -5, svc: 'Color & Highlights', status: 'NO_SHOW', ci: 3 },
    { day: -2, svc: 'Pedicure', status: 'COMPLETED', ci: 4 },
    { day: 1, svc: 'Massage (60 min)', status: 'CONFIRMED', ci: 5 },
    { day: 2, svc: 'Classic Manicure', status: 'BOOKED', ci: 6 },
    { day: 4, svc: 'Blow Dry', status: 'BOOKED', ci: 7 },
    { day: 6, svc: 'Haircut & Style', status: 'CONFIRMED', ci: 0 },
    { day: 9, svc: 'Facial', status: 'BOOKED', ci: 2 },
  ] as const

  for (const p of plan) {
    const svc = serviceByName[p.svc]
    const client = clients[p.ci]
    const start = daysFromNow(p.day, 9 + (Math.abs(p.day) % 7))
    const end = new Date(start.getTime() + svc.dur * 60000)
    const appt = await prisma.appointment.create({
      data: {
        clientId: client.id, staffId: ownerId, startAt: start, endAt: end,
        status: p.status as any, totalPrice: new Prisma.Decimal(svc.price), source: null,
        appointmentServices: { create: [{ serviceId: svc.id, priceAtTime: new Prisma.Decimal(svc.price), durationAtTime: svc.dur }] },
      },
    })
    if (p.status === 'COMPLETED') {
      await prisma.payment.create({
        data: { appointmentId: appt.id, clientId: client.id, amount: new Prisma.Decimal(svc.price), paymentMethod: 'CASH', paidAt: start },
      })
      await prisma.loyaltyTransaction.create({
        data: { clientId: client.id, appointmentId: appt.id, deltaPoints: Math.round(svc.price), reason: 'Visit' },
      })
    }
  }

  // Inventory
  const invCat = await prisma.inventoryCategory.create({ data: { name: 'Supplies', staffId: ownerId } })
  const items = [
    ['Shampoo (1L)', 8, 5, 'bottle', 12], ['Conditioner (1L)', 6, 5, 'bottle', 11],
    ['Nail Polish', 24, 10, 'unit', 6], ['Gel Top Coat', 3, 4, 'bottle', 14],
    ['Face Masks', 40, 15, 'unit', 3], ['Towels', 30, 12, 'unit', 4],
  ] as const
  for (const [name, qty, min, unit, cost] of items) {
    await prisma.inventoryItem.create({
      data: { name, categoryId: invCat.id, staffId: ownerId, quantity: qty, minQuantity: min, unit, cost: new Prisma.Decimal(cost) },
    })
  }

  // Pipeline + a few projects
  const stages = ['Lead', 'Quoted', 'In Progress', 'Done']
  const stageIds: string[] = []
  for (let i = 0; i < stages.length; i++) {
    const s = await prisma.pipelineStage.create({ data: { staffId: ownerId, name: stages[i], color: ['gray', 'blue', 'pink', 'green'][i], sortOrder: i } })
    stageIds.push(s.id)
  }
  const projects = [
    ['Bridal package — Sophie', 3, 450], ['Spa day group booking', 1, 600], ['Monthly hair membership', 0, 120],
  ] as const
  for (let i = 0; i < projects.length; i++) {
    const [title, stageIdx, amount] = projects[i]
    await prisma.project.create({
      data: { staffId: ownerId, title, stageId: stageIds[stageIdx], amount: new Prisma.Decimal(amount), clientName: clients[i].name, sortOrder: i },
    })
  }

  const counts = {
    clients: clients.length,
    services: svcNames.length,
    appointments: plan.length,
    inventory: items.length,
    projects: projects.length,
  }
  console.log('✅ Demo account seeded:', counts)
  console.log(`   Login: ${EMAIL} / ${PASSWORD}`)
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
