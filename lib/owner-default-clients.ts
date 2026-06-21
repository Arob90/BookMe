import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

function displayFirstName(firstName: string | null | undefined, email: string): string {
  const t = firstName?.trim()
  if (t) return t.slice(0, 200)
  const local = email.split('@')[0]?.trim()
  return (local || 'Client').slice(0, 200)
}

function displayLastName(lastName: string | null | undefined): string {
  const t = lastName?.trim()
  return (t || '—').slice(0, 200)
}

async function ensureLoyaltyAccount(clientId: string) {
  const existing = await db.loyaltyAccount.findUnique({ where: { clientId } })
  if (!existing) {
    await db.loyaltyAccount.create({
      data: { clientId, pointsBalance: 0 },
    })
  }
}

/**
 * Ensures the business owner appears under Clients: one INDIVIDUAL (the signup contact)
 * and, when a business name is present, one COMPANY row for that business.
 */
export async function ensureOwnerDefaultClients(opts: {
  staffId: string
  firstName: string | null | undefined
  lastName: string | null | undefined
  email: string
  phone?: string | null | undefined
  businessName?: string | null | undefined
}) {
  const email = opts.email.trim()
  const phone = opts.phone?.trim() || null
  const fn = displayFirstName(opts.firstName, email)
  const ln = displayLastName(opts.lastName)
  const business = opts.businessName?.trim() || null

  const existingPerson = await db.client.findFirst({
    where: {
      staffId: opts.staffId,
      type: 'INDIVIDUAL',
      email,
      firstName: fn,
      lastName: ln,
    },
  })
  if (!existingPerson) {
    const individual = await db.client.create({
      data: {
        staffId: opts.staffId,
        type: 'INDIVIDUAL',
        firstName: fn,
        lastName: ln,
        email,
        phone,
      },
    })
    await ensureLoyaltyAccount(individual.id)
  }

  if (business) {
    const existingCompany = await db.client.findFirst({
      where: {
        staffId: opts.staffId,
        type: 'COMPANY',
        firstName: business,
      },
    })
    if (!existingCompany) {
      const contact = `${fn} ${ln}`.trim() || ln
      const founded = new Date()
      founded.setUTCHours(0, 0, 0, 0)
      const company = await db.client.create({
        data: {
          staffId: opts.staffId,
          type: 'COMPANY',
          firstName: business,
          lastName: contact,
          companyName: business,
          contactName: contact,
          email,
          phone,
        },
      })
      try {
        await db.$executeRaw(Prisma.sql`UPDATE clients SET company_founded_at = ${founded} WHERE id = ${company.id}`)
      } catch {
        /* column missing or stale client — ignore */
      }
      await ensureLoyaltyAccount(company.id)
    }
  }
}
