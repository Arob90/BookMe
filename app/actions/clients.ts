'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { getAppointmentStaffIdsForBusiness, tenantClientWhereClause } from '@/lib/client-tenant'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { startOfWeek, endOfWeek } from 'date-fns'
import { grossPaymentsTotal, invoiceBalanceDue } from '@/lib/payment-net'
import { syncLoyaltyAppointmentsForClient } from '@/app/actions/loyalty'
import { appointmentServiceIncludeWithPipeline } from '@/lib/appointment-service-include'
import { attachPipelineToAppointmentsList } from '@/lib/appointment-pipeline-merge'

/** Confirmed or completed bookings (excludes BOOKED / cancelled-style statuses). */
const CLIENT_STATS_VISIT_STATUSES = new Set(['CONFIRMED', 'COMPLETED'])

function isClientStatsVisit(status: string | undefined | null): boolean {
  return !!status && CLIENT_STATS_VISIT_STATUSES.has(status)
}

/** Persist founding date outside Prisma's typed update so a stale client (pre-`companyFoundedAt`) does not throw. */
async function persistCompanyFoundedAtRaw(clientId: string, value: Date | null) {
  if (value === null) {
    await db.$executeRaw(Prisma.sql`UPDATE clients SET company_founded_at = NULL WHERE id = ${clientId}`)
  } else {
    await db.$executeRaw(Prisma.sql`UPDATE clients SET company_founded_at = ${value} WHERE id = ${clientId}`)
  }
}

/** Money attributed to a visit: gross payments if any; else totalPrice only when completed (legacy). */
function appointmentAttributedSpend(apt: {
  status: string
  totalPrice?: unknown
  payments?: { amount?: unknown; isRefund?: boolean | null }[]
}): number {
  if (!isClientStatsVisit(apt.status)) return 0
  const gross = grossPaymentsTotal(apt.payments)
  if (gross > 0.009) return gross
  if (apt.status === 'COMPLETED') return Number(apt.totalPrice || 0)
  return 0
}

const createClientBaseSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'COMPANY']).default('INDIVIDUAL'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  contactIds: z.array(z.string()).optional(),
  taxId: z.string().optional(),
  contactName: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  birthday: z.string().optional(),
  companyFoundedAt: z.string().optional().nullable(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

function isValidYmd(value: string | null | undefined): boolean {
  if (value == null || !String(value).trim()) return false
  const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
}

/** Refined schema for creates; updates use `createClientBaseSchema.partial()` (ZodEffects has no `.partial()`). */
const createClientSchema = createClientBaseSchema
  .refine(
    (data) => {
      if (data.type === 'INDIVIDUAL') {
        return !!data.firstName?.trim() && !!data.lastName?.trim()
      }
      return !!data.companyName?.trim()
    },
    { message: 'Individual requires first and last name; Company requires company name' }
  )
  .refine(
    (data) => data.type !== 'COMPANY' || isValidYmd(data.companyFoundedAt),
    { message: 'Company requires a valid founded date (YYYY-MM-DD)', path: ['companyFoundedAt'] }
  )

export async function createClient(data: z.infer<typeof createClientSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const tenantWhere = await tenantClientWhereClause(ownerStaffId)

  const validated = createClientSchema.parse(data)

  // Map to firstName/lastName for DB (required fields). For COMPANY, use companyName/contactName.
  const firstName = validated.type === 'COMPANY'
    ? (validated.companyName?.trim() ?? '')
    : (validated.firstName?.trim() ?? '')
  const lastName = validated.type === 'COMPANY'
    ? (validated.contactName?.trim() || validated.companyName?.trim() || '—')
    : (validated.lastName?.trim() ?? '')

  // Parse birthday in local time to avoid timezone shifts (only for individuals)
  let birthdayDate: Date | null = null
  if (validated.birthday && validated.type === 'INDIVIDUAL') {
    const [year, month, day] = validated.birthday.split('-').map(Number)
    birthdayDate = new Date(year, month - 1, day)
  }

  let companyFoundedDate: Date | null = null
  if (validated.type === 'COMPANY' && validated.companyFoundedAt) {
    const [y, mo, d] = validated.companyFoundedAt.split('-').map(Number)
    companyFoundedDate = new Date(y, mo - 1, d)
  }

  // Check for existing client to prevent duplicates
  // Use firstName for company lookup (companyName stored in firstName for companies; avoids Prisma client compatibility)
  if (validated.type === 'COMPANY' && validated.companyName) {
    const existingCompany = await db.client.findFirst({
      where: {
        AND: [
          tenantWhere,
          { type: 'COMPANY' as const, firstName: validated.companyName.trim() },
        ],
      },
    })
    if (existingCompany) {
      throw new Error('A client with this company name already exists')
    }
  }

  if (validated.email) {
    const nameWhere =
      validated.type === 'COMPANY'
        ? { email: validated.email, type: 'COMPANY' as const, firstName: validated.companyName?.trim() || '' }
        : { email: validated.email, firstName, lastName }
    const existingByEmail = await db.client.findFirst({
      where: { AND: [tenantWhere, nameWhere] },
    })
    if (existingByEmail) {
      throw new Error('A client with this email and name already exists')
    }
  }

  if (validated.phone) {
    const phoneWhere =
      validated.type === 'COMPANY'
        ? { phone: validated.phone, type: 'COMPANY' as const, firstName: validated.companyName?.trim() || '' }
        : { phone: validated.phone, firstName, lastName }
    const existingByPhone = await db.client.findFirst({
      where: { AND: [tenantWhere, phoneWhere] },
    })
    if (existingByPhone) {
      throw new Error('A client with this phone number and name already exists')
    }
  }

  if (birthdayDate && validated.type === 'INDIVIDUAL') {
    const existingByNameAndBirthday = await db.client.findFirst({
      where: {
        AND: [tenantWhere, { firstName, lastName, birthday: birthdayDate }],
      },
    })
    if (existingByNameAndBirthday) {
      throw new Error('A client with this name and birthday already exists')
    }
  }

  const createData: Record<string, unknown> = {
    staffId: ownerStaffId,
    type: validated.type,
    firstName,
    lastName,
    phone: validated.phone || null,
    email: validated.email || null,
    birthday: birthdayDate,
    notes: validated.notes || null,
    tags: validated.tags,
  }
  const addressFields = {
    addressLine1: validated.addressLine1?.trim() || null,
    addressLine2: validated.addressLine2?.trim() || null,
    city: validated.city?.trim() || null,
    state: validated.state?.trim() || null,
    postalCode: validated.postalCode?.trim() || null,
    country: validated.country?.trim() || null,
  }
  if (validated.type === 'COMPANY') {
    if (validated.companyName) createData.companyName = validated.companyName.trim() || null
    if (validated.taxId) createData.taxId = validated.taxId.trim() || null
    if (validated.contactName) createData.contactName = validated.contactName.trim() || null
    // companyFoundedAt applied via raw SQL after create — avoids "Unknown argument companyFoundedAt" on stale Prisma clients
  }
  if (validated.type === 'INDIVIDUAL' && validated.companyId) createData.companyId = validated.companyId

  // Include address fields if present (requires migration to be applied)
  const createWithAddress = { ...createData, ...addressFields }

  let client
  try {
    client = await db.client.create({
      data: createWithAddress as any,
    })
  } catch (err: any) {
    // If Prisma doesn't recognize address fields (migration not run), retry without them
    if (err?.message?.includes('Unknown argument') || err?.message?.includes('addressLine')) {
      client = await db.client.create({
        data: createData as any,
      })
    } else {
      throw err
    }
  }

  if (validated.type === 'COMPANY' && companyFoundedDate) {
    try {
      await persistCompanyFoundedAtRaw(client.id, companyFoundedDate)
    } catch (e) {
      console.warn('[createClient] company_founded_at not updated (migration or DB):', e)
    }
  }

  // If company and contactIds/contactId provided, link people to this company
  const contactIdsToLink = validated.contactIds?.length
    ? validated.contactIds
    : validated.contactId
      ? [validated.contactId]
      : []
  if (validated.type === 'COMPANY' && contactIdsToLink.length > 0) {
    let primaryName: string | null = null
    for (const contactId of contactIdsToLink) {
      const contactInTenant = await db.client.findFirst({
        where: { id: contactId, ...tenantWhere },
      })
      if (!contactInTenant) continue
      try {
        await db.client.update({
          where: { id: contactId },
          data: { companyId: client.id },
        })
        const contact = await db.client.findUnique({
          where: { id: contactId },
          select: { firstName: true, lastName: true },
        })
        if (contact && !primaryName) {
          primaryName = `${contact.firstName} ${contact.lastName}`.trim()
        }
      } catch (_) {
        // Ignore if update fails
      }
    }
    if (primaryName) {
      try {
        await db.client.update({
          where: { id: client.id },
          data: { contactName: primaryName, lastName: primaryName } as any,
        })
      } catch (_) {}
    }
  }

  // Create loyalty account
  await db.loyaltyAccount.create({
    data: { clientId: client.id, pointsBalance: 0 },
  })

  revalidatePath('/app/clients')
  return client
}

export async function updateClient(id: string, data: Partial<z.infer<typeof createClientBaseSchema>>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const tenantWhere = await tenantClientWhereClause(ownerStaffId)
  const existingClient = await db.client.findFirst({
    where: { id, ...tenantWhere },
  })
  if (!existingClient) throw new Error('Client not found')

  const validated = createClientBaseSchema.partial().parse(data)

  const updateData: any = {}
  if (validated.firstName !== undefined) updateData.firstName = validated.firstName
  if (validated.lastName !== undefined) updateData.lastName = validated.lastName
  if (validated.companyName !== undefined) updateData.companyName = validated.companyName || null
  if (validated.companyId !== undefined) updateData.companyId = validated.companyId || null
  if (validated.taxId !== undefined) updateData.taxId = validated.taxId || null
  if (validated.contactName !== undefined) updateData.contactName = validated.contactName || null
  if (validated.addressLine1 !== undefined) updateData.addressLine1 = validated.addressLine1 || null
  if (validated.addressLine2 !== undefined) updateData.addressLine2 = validated.addressLine2 || null
  if (validated.city !== undefined) updateData.city = validated.city || null
  if (validated.state !== undefined) updateData.state = validated.state || null
  if (validated.postalCode !== undefined) updateData.postalCode = validated.postalCode || null
  if (validated.country !== undefined) updateData.country = validated.country || null
  if (validated.phone !== undefined) updateData.phone = validated.phone || null
  if (validated.email !== undefined) updateData.email = validated.email || null
  if (validated.birthday !== undefined) {
    if (validated.birthday) {
      const [year, month, day] = validated.birthday.split('-').map(Number)
      updateData.birthday = new Date(year, month - 1, day)
    } else {
      updateData.birthday = null
    }
  }
  let companyFoundedAtForRaw: Date | null | undefined = undefined
  if (validated.companyFoundedAt !== undefined && existingClient.type === 'COMPANY') {
    const raw = validated.companyFoundedAt
    if (raw && isValidYmd(raw)) {
      const [y, mo, d] = raw.split('-').map(Number)
      companyFoundedAtForRaw = new Date(y, mo - 1, d)
    } else if (raw === null || raw === '') {
      companyFoundedAtForRaw = null
    }
  }
  if (validated.notes !== undefined) updateData.notes = validated.notes || null
  if (validated.tags !== undefined) updateData.tags = validated.tags

  // For COMPANY type, keep firstName/lastName in sync with companyName/contactName
  if (validated.companyName !== undefined) updateData.firstName = validated.companyName.trim() || ''
  if (validated.contactName !== undefined) updateData.lastName = validated.contactName.trim() || validated.companyName?.trim() || '—'

  const client = await db.client.update({
    where: { id },
    data: updateData,
  })

  if (companyFoundedAtForRaw !== undefined) {
    try {
      await persistCompanyFoundedAtRaw(id, companyFoundedAtForRaw)
    } catch (e) {
      console.warn('[updateClient] company_founded_at not updated (migration or DB):', e)
    }
  }

  // If company and contactIds/contactId provided, link people and set contactName
  const contactIdsToLink = validated.contactIds?.length
    ? validated.contactIds
    : validated.contactId !== undefined && validated.contactId !== null
      ? [validated.contactId]
      : null
  const clearContacts = validated.contactIds?.length === 0 || validated.contactId === null

  if (client.type === 'COMPANY' && contactIdsToLink && contactIdsToLink.length > 0) {
    // Unlink existing contacts first, then link new ones
    await db.client.updateMany({
      where: { companyId: id },
      data: { companyId: null },
    })
    let primaryName: string | null = null
    for (const contactId of contactIdsToLink) {
      const contactInTenant = await db.client.findFirst({
        where: { id: contactId, ...tenantWhere },
      })
      if (!contactInTenant) continue
      try {
        await db.client.update({
          where: { id: contactId },
          data: { companyId: id },
        })
        const contact = await db.client.findUnique({
          where: { id: contactId },
          select: { firstName: true, lastName: true },
        })
        if (contact && !primaryName) primaryName = `${contact.firstName} ${contact.lastName}`.trim()
      } catch (_) {}
    }
    if (primaryName) {
      try {
        await db.client.update({
          where: { id },
          data: { contactName: primaryName, lastName: primaryName } as any,
        })
      } catch (_) {}
    }
  } else if (client.type === 'COMPANY' && clearContacts) {
    try {
      await db.client.updateMany({
        where: { companyId: id },
        data: { companyId: null },
      })
      const companyName = validated.companyName?.trim() || client.firstName || '—'
      await db.client.update({
        where: { id },
        data: { contactName: null, lastName: companyName } as any,
      })
    } catch (_) {}
  }

  revalidatePath('/app/clients')
  revalidatePath(`/app/clients/${id}`)
  return client
}

export async function deleteClient(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const tenantWhere = await tenantClientWhereClause(ownerStaffId)
  const row = await db.client.findFirst({ where: { id, ...tenantWhere } })
  if (!row) throw new Error('Client not found')

  const staffIds = await getAppointmentStaffIdsForBusiness(ownerStaffId)
  const appointmentCount = await db.appointment.count({
    where: { clientId: id, staffId: { in: staffIds } },
  })

  if (appointmentCount > 0) {
    throw new Error(`Cannot delete client with ${appointmentCount} appointment(s). Please cancel or delete appointments first.`)
  }

  await db.client.delete({ where: { id } })

  revalidatePath('/app/clients')
  return { success: true }
}

export async function getClients(filters?: {
  search?: string
  type?: 'INDIVIDUAL' | 'COMPANY'
  birthdayMonth?: boolean
  hasStrikes?: boolean
  vip?: boolean
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const tenantWhere = await tenantClientWhereClause(ownerStaffId)

  const andParts: Prisma.ClientWhereInput[] = [tenantWhere]

  if (filters?.search) {
    andParts.push({
      OR: [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ],
    })
  }

  if (filters?.type) {
    andParts.push({ type: filters.type })
  }

  // Note: birthdayMonth filter is handled after fetching because we need to compare
  // month/day only, ignoring the year. Prisma doesn't support this directly.
  // We'll fetch all clients with birthdays and filter in JavaScript.

  if (filters?.vip) {
    andParts.push({ tags: { has: 'VIP' } })
  }

  if (filters?.birthdayMonth) {
    andParts.push({ birthday: { not: null } })
  }

  const where: Prisma.ClientWhereInput = { AND: andParts }

  // Optimize: Only include minimal data for dashboard birthday filter
  const minimal = filters?.birthdayMonth && !filters?.search && !filters?.hasStrikes && !filters?.vip

  const businessStaffIds = minimal ? [] : await getAppointmentStaffIdsForBusiness(ownerStaffId)

  const clients = await db.client.findMany({
    where,
    include: minimal ? {
      loyaltyAccount: {
        select: {
          pointsBalance: true,
        },
      },
    } : {
      appointments: {
        // Owner + team members: appointments may be attributed to any staff id in the business.
        where: {
          staffId: { in: businessStaffIds },
        },
        select: {
          id: true,
          totalPrice: true,
          status: true,
          startAt: true,
        },
      },
      payments: {
        where: {
          appointment: {
            staffId: { in: businessStaffIds },
          },
        },
        select: {
          amount: true,
          appointmentId: true,
          isRefund: true,
        },
      },
      loyaltyAccount: true,
      strikeEvents: {
        // Keep strike visibility scoped to this business via the appointment relationship.
        where: {
          appointment: {
            staffId: { in: businessStaffIds },
          },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          delta: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          appointments: true,
          strikeEvents: true,
        },
      },
    },
    orderBy: { lastName: 'asc' },
  })

  // Attach company info for clients with companyId (Prisma relation may not be generated yet)
  const companyMap = Object.fromEntries(
    clients.filter((c: any) => c.type === 'COMPANY').map((c: any) => [c.id, { id: c.id, companyName: c.companyName || c.firstName, firstName: c.firstName }])
  )
  const clientsWithCompany = clients.map((c: any) =>
    c.companyId && companyMap[c.companyId] ? { ...c, company: companyMap[c.companyId] } : c
  )

  // Filter by birthday month if requested (compare month/day only, ignore year)
  let filteredClients = clientsWithCompany
  if (filters?.birthdayMonth) {
    const now = new Date()
    const currentMonth = now.getMonth()
    filteredClients = clientsWithCompany.filter((client) => {
      if (!client.birthday) return false
      const bday = new Date(client.birthday)
      // Compare month only (ignore year and day for "this month" filter)
      return bday.getMonth() === currentMonth
    })
  }

  // Calculate lifetime spend, completed visits, and pending balance for each client
  const clientsWithSpend = filteredClients.map((client: any) => {
    // Handle minimal data case (for birthday month filter)
    const allAppointments = (client.appointments || []) as any[]
    const payments = (client.payments || []) as any[]

    const paymentsPerApt = payments.reduce((acc: Record<string, any[]>, payment: any) => {
      const id = payment.appointmentId as string | undefined
      if (!id) return acc
      if (!acc[id]) acc[id] = []
      acc[id].push(payment)
      return acc
    }, {} as Record<string, any[]>)

    const visitAppointments = allAppointments.filter((apt: any) => isClientStatsVisit(apt.status))
    const lifetimeSpend = visitAppointments.reduce(
      (sum: number, apt: any) => sum + appointmentAttributedSpend({ ...apt, payments: paymentsPerApt[apt.id] }),
      0
    )
    const completedVisits = visitAppointments.length

    // Calculate upcoming appointments for this week (Sunday to Saturday)
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 0 }) // 0 = Sunday
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 }) // 0 = Sunday
    const upcomingThisWeek = allAppointments.filter((apt: any) => {
      if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') return false
      if (!apt.startAt) return false
      const aptDate = new Date(apt.startAt)
      if (isNaN(aptDate.getTime())) return false
      return aptDate >= weekStart && aptDate <= weekEnd && aptDate >= now
    })
    const upcomingAmount = upcomingThisWeek.reduce(
      (sum: number, apt: any) => sum + Number(apt.totalPrice || 0),
      0
    )
    const upcomingCount = upcomingThisWeek.length

    let pendingBalance = 0
    let pendingBillsCount = 0
    // Pending bills: accepted (CONFIRMED) or completed visits only — not BOOKED awaiting acceptance
    allAppointments.forEach((apt: any) => {
      if (apt.status !== 'CONFIRMED' && apt.status !== 'COMPLETED') return
      const totalPrice = Number(apt.totalPrice || 0)
      const pending = invoiceBalanceDue(totalPrice, paymentsPerApt[apt.id])
      if (pending > 0) {
        pendingBalance += pending
        pendingBillsCount++
      }
    })

    return {
      ...client,
      lifetimeSpend,
      completedVisits,
      pendingBalance,
      pendingBillsCount,
      hasPendingBills: pendingBillsCount > 0,
      upcomingThisWeek: upcomingCount,
      upcomingAmount: upcomingAmount,
      // Convert Decimal to number for serialization
      appointments: allAppointments.map((apt: any) => ({
        ...apt,
        totalPrice: apt.totalPrice ? Number(apt.totalPrice) : null,
      })),
      payments: payments.map((p: any) => ({
        ...p,
        amount: p.amount ? Number(p.amount) : null,
      })),
    }
  })

  // Filter by strikes if needed
  if (filters?.hasStrikes) {
    const clientsWithStrikes = await Promise.all(
      clientsWithSpend.map(async (client) => {
        const strikes = await db.strikeEvent.findMany({
          where: {
            clientId: client.id,
            appointment: {
              staffId: getSessionStaffId(session),
            },
          },
        })
        return { client, strikeCount: strikes.length }
      })
    )
    return clientsWithStrikes
      .filter(({ strikeCount }) => strikeCount > 0)
      .map(({ client }) => client)
  }

  return clientsWithSpend
}

export async function getClient(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const tenantWhere = await tenantClientWhereClause(ownerStaffId)

  const clientRaw = await db.client.findFirst({
    where: { id, ...tenantWhere },
    include: {
      appointments: {
        where: {
          staffId: getSessionStaffId(session), // Only show appointments for this business
        },
        include: {
          appointmentServices: { include: appointmentServiceIncludeWithPipeline },
          payments: {
            select: {
              id: true,
              amount: true,
              isRefund: true,
              paymentMethod: true,
              paidAt: true,
              notes: true,
              attachmentUrls: true,
            },
            orderBy: { paidAt: 'desc' },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          loyaltyTransactions: {
            select: { deltaPoints: true, reason: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { startAt: 'desc' },
      },
      loyaltyAccount: true,
      loyaltyTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      strikeEvents: {
        // Keep strike visibility scoped to this business via the appointment relationship.
        where: {
          appointment: {
            staffId: getSessionStaffId(session),
          },
        },
        orderBy: { createdAt: 'desc' },
        include: { appointment: true },
      },
      payments: {
        where: {
          appointment: {
            staffId: getSessionStaffId(session), // Only show payments for this business's appointments
          },
        },
        include: {
          appointment: {
            select: {
              id: true,
              startAt: true,
              totalPrice: true,
            },
          },
        },
        orderBy: { paidAt: 'desc' },
      },
    },
  })

  if (!clientRaw) throw new Error('Client not found')

  const appointmentsMerged = await attachPipelineToAppointmentsList(clientRaw.appointments)
  const client = { ...clientRaw, appointments: appointmentsMerged }

  // Attach company and contacts (Prisma relation may not be generated yet)
  const clientWithRelations = { ...client } as any
  if (client.companyId) {
    const company = await db.client.findFirst({
      where: { id: client.companyId, ...tenantWhere },
      select: { id: true, companyName: true, firstName: true },
    })
    clientWithRelations.company = company
  }
  if (client.type === 'COMPANY') {
    const contacts = await db.client.findMany({
      where: { companyId: client.id, ...tenantWhere },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    })
    clientWithRelations.contacts = contacts
  }

  const visitAppointments = client.appointments.filter((a) => isClientStatsVisit(a.status))
  const lifetimeSpend = visitAppointments.reduce(
    (sum, a) => sum + appointmentAttributedSpend(a),
    0
  )

  const paymentsPerApt = client.payments.reduce(
    (acc, payment) => {
      const id = payment.appointmentId
      if (!acc[id]) acc[id] = []
      acc[id].push(payment)
      return acc
    },
    {} as Record<string, typeof client.payments[number][]>
  )

  let pendingBalance = 0
  let pendingBillsCount = 0
  // Pending bills: CONFIRMED or COMPLETED only (not BOOKED until you accept)
  client.appointments.forEach((apt) => {
    if (apt.status !== 'CONFIRMED' && apt.status !== 'COMPLETED') return
    const totalPrice = Number(apt.totalPrice || 0)
    const pending = invoiceBalanceDue(totalPrice, paymentsPerApt[apt.id])
    if (pending > 0) {
      pendingBalance += pending
      pendingBillsCount++
    }
  })

  // Calculate upcoming appointments for this week (Sunday to Saturday)
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }) // 0 = Sunday
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 }) // 0 = Sunday
  const upcomingThisWeek = client.appointments.filter((apt: any) => {
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') return false
    if (!apt.startAt) return false
    const aptDate = new Date(apt.startAt)
    if (isNaN(aptDate.getTime())) return false
    return aptDate >= weekStart && aptDate <= weekEnd && aptDate >= now
  })
  const upcomingAmount = upcomingThisWeek.reduce(
    (sum: number, apt: any) => sum + Number(apt.totalPrice || 0),
    0
  )

  const staffSessionId = getSessionStaffId(session)
  await syncLoyaltyAppointmentsForClient(client.id, staffSessionId)

  const [loyaltyAccountFresh, loyaltyTransactionsFresh] = await Promise.all([
    db.loyaltyAccount.findUnique({ where: { clientId: client.id } }),
    db.loyaltyTransaction.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  return {
    ...clientWithRelations,
    lifetimeSpend,
    totalVisits: visitAppointments.length,
    lastVisit: (() => {
      const nowMs = Date.now()
      for (const a of visitAppointments) {
        if (new Date(a.startAt).getTime() <= nowMs) return a.startAt
      }
      return null
    })(),
    nextBooking: client.appointments.find(
      (a) => a.status === 'BOOKED' || a.status === 'CONFIRMED'
    )?.startAt || null,
    pendingBalance,
    pendingBillsCount,
    hasPendingBills: pendingBillsCount > 0,
    upcomingThisWeek: upcomingThisWeek.length,
    upcomingAmount,
    // Convert Decimal to number for serialization
    appointments: client.appointments.map((apt: any) => ({
      ...apt,
      totalPrice: apt.totalPrice ? Number(apt.totalPrice) : null,
      appointmentServices: apt.appointmentServices?.map((as: any) => ({
        ...as,
        priceAtTime: as.priceAtTime ? Number(as.priceAtTime) : null,
        service: as.service ? {
          ...as.service,
          price: as.service.price ? Number(as.service.price) : null,
        } : null,
      })) || [],
      payments: apt.payments?.map((p: any) => ({
        ...p,
        amount: p.amount ? Number(p.amount) : null,
      })) || [],
    })),
    payments: client.payments.map((p: any) => ({
      ...p,
      amount: p.amount ? Number(p.amount) : null,
      appointment: p.appointment ? {
        ...p.appointment,
        totalPrice: p.appointment.totalPrice ? Number(p.appointment.totalPrice) : null,
      } : null,
    })),
    loyaltyAccount: loyaltyAccountFresh,
    loyaltyTransactions: loyaltyTransactionsFresh,
  }
}
