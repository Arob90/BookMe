'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { invoiceBalanceDue } from '@/lib/payment-net'

async function getLoyaltySettingsForBusiness(staffId: string) {
  try {
    return await db.settings.findUnique({ where: { staffId } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unknown argument `staffId`')) {
      return await db.settings.findUnique({ where: { id: 'singleton' } })
    }
    throw error
  }
}

/**
 * One earn event per appointment (idempotent). Uses sum of Service.pointsWorth when any line has
 * points; otherwise Settings PER_DOLLAR / PER_VISIT on appointment total.
 *
 * CONFIRMED: only when the invoice is fully paid (gross).
 * COMPLETED: awards even if unpaid (legacy / comped visits), same as before.
 */
export async function awardLoyaltyForAppointmentIfEligible(options: {
  appointmentId: string
  staffId: string
  reason: string
}): Promise<{ awarded: boolean; points?: number }> {
  const appointment = await db.appointment.findFirst({
    where: { id: options.appointmentId, staffId: options.staffId },
    include: {
      payments: { select: { amount: true, isRefund: true } },
      appointmentServices: {
        include: { service: { select: { pointsWorth: true } } },
      },
      loyaltyTransactions: { select: { id: true }, take: 1 },
    },
  })

  if (!appointment) return { awarded: false }
  if (appointment.status !== 'CONFIRMED' && appointment.status !== 'COMPLETED') {
    return { awarded: false }
  }

  if (appointment.loyaltyTransactions.length > 0) {
    return { awarded: false }
  }

  const totalPrice = Number(appointment.totalPrice || 0)
  if (appointment.status === 'CONFIRMED') {
    if (invoiceBalanceDue(totalPrice, appointment.payments) > 0.01) {
      return { awarded: false }
    }
  }

  const settings = await getLoyaltySettingsForBusiness(options.staffId)
  let pointsToAward = 0
  const lines = appointment.appointmentServices

  if (lines.length > 0) {
    for (const as of lines) {
      const pw = as.service?.pointsWorth
      if (pw != null) {
        pointsToAward += Math.max(0, pw)
        continue
      }
      if (!settings) continue
      const linePrice = Number(as.priceAtTime || 0)
      if (settings.loyaltyEarnMode === 'PER_DOLLAR' && settings.loyaltyPointsPerDollar) {
        if (linePrice > 0) {
          pointsToAward += Math.floor(linePrice * Number(settings.loyaltyPointsPerDollar))
        }
      } else if (settings.loyaltyEarnMode === 'PER_VISIT' && settings.loyaltyPointsPerVisit) {
        pointsToAward += settings.loyaltyPointsPerVisit
      }
    }
  } else if (settings) {
    if (settings.loyaltyEarnMode === 'PER_DOLLAR' && settings.loyaltyPointsPerDollar && totalPrice > 0) {
      pointsToAward = Math.floor(totalPrice * Number(settings.loyaltyPointsPerDollar))
    } else if (settings.loyaltyEarnMode === 'PER_VISIT' && settings.loyaltyPointsPerVisit) {
      pointsToAward = settings.loyaltyPointsPerVisit
    }
  }

  if (pointsToAward <= 0) return { awarded: false }

  await db.loyaltyAccount.upsert({
    where: { clientId: appointment.clientId },
    create: { clientId: appointment.clientId, pointsBalance: 0 },
    update: {},
  })

  await db.loyaltyTransaction.create({
    data: {
      clientId: appointment.clientId,
      appointmentId: appointment.id,
      deltaPoints: pointsToAward,
      reason: options.reason,
    },
  })

  await db.loyaltyAccount.update({
    where: { clientId: appointment.clientId },
    data: { pointsBalance: { increment: pointsToAward } },
  })

  return { awarded: true, points: pointsToAward }
}

/**
 * Grant missing loyalty for all eligible past visits for this client (idempotent).
 * Used when opening a client profile and by the global backfill action.
 */
export async function syncLoyaltyAppointmentsForClient(clientId: string, staffId: string) {
  const withTx = await db.loyaltyTransaction.findMany({
    where: { clientId, appointmentId: { not: null } },
    select: { appointmentId: true },
  })
  const alreadyAwarded = new Set(
    withTx.map((t) => t.appointmentId).filter((id): id is string => id != null)
  )

  const where: {
    clientId: string
    staffId: string
    status: { in: ('CONFIRMED' | 'COMPLETED')[] }
    id?: { notIn: string[] }
  } = {
    clientId,
    staffId,
    status: { in: ['CONFIRMED', 'COMPLETED'] },
  }
  if (alreadyAwarded.size > 0) {
    where.id = { notIn: [...alreadyAwarded] }
  }

  const candidates = await db.appointment.findMany({
    where,
    select: { id: true },
  })

  for (const { id } of candidates) {
    await awardLoyaltyForAppointmentIfEligible({
      appointmentId: id,
      staffId,
      reason: 'Visit history (synced)',
    })
  }
}

const adjustPointsSchema = z.object({
  clientId: z.string(),
  deltaPoints: z.number().int(),
  reason: z.string(),
  appointmentId: z.string().optional(),
})

export async function adjustLoyaltyPoints(data: z.infer<typeof adjustPointsSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = adjustPointsSchema.parse(data)

  // Create transaction
  await db.loyaltyTransaction.create({
    data: {
      clientId: validated.clientId,
      appointmentId: validated.appointmentId || null,
      deltaPoints: validated.deltaPoints,
      reason: validated.reason,
    },
  })

  // Update balance
  await db.loyaltyAccount.update({
    where: { clientId: validated.clientId },
    data: {
      pointsBalance: { increment: validated.deltaPoints },
    },
  })

  revalidatePath(`/app/clients/${validated.clientId}`)
  revalidatePath('/app/loyalty')
}

export async function getLoyaltyAccounts(options?: {
  limit?: number
  /** If set, only accounts with at least this many points (e.g. 1 = earned points only). */
  minPointsBalance?: number
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Only show loyalty accounts for clients that have appointments with this business
  const accounts = await db.loyaltyAccount.findMany({
    where: {
      client: {
        appointments: {
          some: {
            staffId: getSessionStaffId(session),
          },
        },
      },
      ...(options?.minPointsBalance !== undefined
        ? { pointsBalance: { gte: options.minPointsBalance } }
        : {}),
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { pointsBalance: 'desc' },
    ...(options?.limit ? { take: options.limit } : {}),
  })

  return accounts
}

/**
 * Backfill loyalty points for completed appointments that don't have points yet
 * This fixes the issue where appointments were created as COMPLETED directly
 * or existed before loyalty was properly configured
 */
export async function backfillLoyaltyPoints() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const staffId = getSessionStaffId(session)

  const settings = await getLoyaltySettingsForBusiness(staffId)
  if (!settings) {
    throw new Error('Settings not found. Please configure loyalty settings first.')
  }

  const clientRows = await db.appointment.findMany({
    where: {
      staffId,
      status: { in: ['COMPLETED', 'CONFIRMED'] },
    },
    select: { clientId: true },
    distinct: ['clientId'],
  })

  let processed = 0
  let errors = 0

  for (const { clientId } of clientRows) {
    try {
      const before = await db.loyaltyTransaction.count({
        where: { clientId, appointmentId: { not: null } },
      })
      await syncLoyaltyAppointmentsForClient(clientId, staffId)
      const after = await db.loyaltyTransaction.count({
        where: { clientId, appointmentId: { not: null } },
      })
      processed += Math.max(0, after - before)
    } catch (error) {
      console.error(`Error syncing loyalty for client ${clientId}:`, error)
      errors++
    }
  }

  revalidatePath('/app/loyalty')
  revalidatePath('/app/clients')

  return {
    processed,
    skipped: 0,
    errors,
    message: `Created up to ${processed} new loyalty award(s) across ${clientRows.length} client(s). ${errors ? `${errors} error(s).` : ''}`,
  }
}

/**
 * Recalculate all loyalty account balances based on transactions
 * Useful if balances got out of sync
 */
export async function recalculateLoyaltyBalances() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const accounts = await db.loyaltyAccount.findMany({
    include: {
      client: {
        include: {
          loyaltyTransactions: true,
        },
      },
    },
  })

  let updated = 0

  for (const account of accounts) {
    const totalPoints = account.client.loyaltyTransactions.reduce(
      (sum, tx) => sum + tx.deltaPoints,
      0
    )

    if (account.pointsBalance !== totalPoints) {
      await db.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          pointsBalance: totalPoints,
        },
      })
      updated++
    }
  }

  revalidatePath('/app/loyalty')
  revalidatePath('/app/clients')

  return {
    updated,
    message: `Updated ${updated} account balances`,
  }
}

/**
 * Get loyalty transactions for a specific client with appointment and service details
 */
export async function getClientLoyaltyTransactions(clientId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const transactions = await db.loyaltyTransaction.findMany({
    where: {
      clientId,
    },
    include: {
      appointment: {
        include: {
          appointmentServices: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  pointsWorth: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return transactions
}
