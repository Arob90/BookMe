'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const addStrikeSchema = z.object({
  clientId: z.string(),
  type: z.enum(['LATE_CANCEL', 'NO_SHOW', 'MANUAL']),
  delta: z.number().int().default(1),
  appointmentId: z.string().optional(),
  reason: z.string().optional(),
})

export async function addStrike(data: z.infer<typeof addStrikeSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = addStrikeSchema.parse(data)

  const strike = await db.strikeEvent.create({
    data: {
      clientId: validated.clientId,
      appointmentId: validated.appointmentId || null,
      type: validated.type,
      delta: validated.delta,
    },
  })

  revalidatePath(`/app/clients/${validated.clientId}`)
  revalidatePath('/app/policies')
  revalidatePath('/app/loyalty')
  return strike
}

export async function getStrikes(clientId?: string, options?: { limit?: number; minimal?: boolean }) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const where: any = {}
  if (clientId) {
    where.clientId = clientId
  }
  // Only show strikes for clients that have appointments with this business
  where.client = {
    appointments: {
      some: {
        staffId: getSessionStaffId(session),
      },
    },
  }
  
  const limit = options?.limit
  const minimal = options?.minimal

  const strikes = await db.strikeEvent.findMany({
    where,
    include: minimal ? {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    } : {
      client: true,
      appointment: true,
    },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  })

  return strikes
}

export async function getClientStrikeCount(clientId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  let settings
  try {
    settings = await db.settings.findUnique({ where: { staffId: getSessionStaffId(session) } })
  } catch (error: any) {
    // Fallback to singleton if staffId not available yet
    if (error.message?.includes('Unknown argument `staffId`')) {
      settings = await db.settings.findUnique({ where: { id: 'singleton' } })
    } else {
      throw error
    }
  }
  const expirationDays = settings?.strikeExpirationDays || 90

  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() - expirationDays)

  // Only count strikes for appointments with this business
  const strikes = await db.strikeEvent.findMany({
    where: {
      clientId,
      createdAt: { gte: expirationDate },
      // Only count strikes related to appointments for this business
      OR: [
        { appointment: null }, // Manual strikes (no appointment)
        { appointment: { staffId: getSessionStaffId(session) } }, // Strikes for this business's appointments
      ],
    },
  })

  const totalStrikes = strikes.reduce((sum, s) => sum + s.delta, 0)
  const threshold = settings?.strikeThreshold || 3

  return {
    count: totalStrikes,
    threshold,
    isRestricted: totalStrikes >= threshold,
  }
}
