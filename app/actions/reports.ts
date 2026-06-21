'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { getAppointmentStaffIdsForBusiness, tenantClientWhereClause } from '@/lib/client-tenant'

export async function getRevenueReport(startDate: Date, endDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const appointments = await db.appointment.findMany({
    where: {
      staffId: getSessionStaffId(session)!,
      status: 'COMPLETED',
      startAt: { gte: startDate, lte: endDate },
    },
  })

  const totalRevenue = appointments.reduce(
    (sum, a) => sum + Number(a.totalPrice),
    0
  )

  return {
    totalRevenue,
    appointmentCount: appointments.length,
    averageTicket: appointments.length > 0 ? totalRevenue / appointments.length : 0,
  }
}

export async function getNoShowReport(startDate: Date, endDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const noShows = await db.appointment.findMany({
    where: {
      staffId: getSessionStaffId(session)!,
      status: 'NO_SHOW',
      startAt: { gte: startDate, lte: endDate },
    },
    include: { client: true },
  })

  return {
    count: noShows.length,
    appointments: noShows,
  }
}

export async function getTopClients(limit: number = 10) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerId = getSessionStaffId(session)!
  const tenantWhere = await tenantClientWhereClause(ownerId)
  const staffIds = await getAppointmentStaffIdsForBusiness(ownerId)

  const clients = await db.client.findMany({
    where: {
      AND: [
        tenantWhere,
        {
          appointments: {
            some: { staffId: { in: staffIds }, status: 'COMPLETED' },
          },
        },
      ],
    },
    include: {
      appointments: {
        where: { staffId: { in: staffIds }, status: 'COMPLETED' },
      },
    },
  })

  const clientsWithStats = clients.map((client) => {
    const completedAppointments = client.appointments
    const totalSpend = completedAppointments.reduce(
      (sum, a) => sum + Number(a.totalPrice),
      0
    )

    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      totalSpend,
      totalVisits: completedAppointments.length,
    }
  })

  return clientsWithStats
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit)
}

export async function getStrikeEventsReport(startDate: Date, endDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  return db.strikeEvent.findMany({
    where: {
      appointment: { staffId: getSessionStaffId(session)! },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      client: true,
      appointment: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}
