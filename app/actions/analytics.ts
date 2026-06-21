'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { getAppointmentStaffIdsForBusiness, tenantClientWhereClause } from '@/lib/client-tenant'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears, format, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval } from 'date-fns'

/** Revenue / service analytics: same as dashboard "recognized" visits (not BOOKED-only). */
const RECOGNIZED_REVENUE_STATUSES: Array<'CONFIRMED' | 'COMPLETED'> = ['CONFIRMED', 'COMPLETED']

async function staffIdsForSession(session: { user: { id: string } }): Promise<string[]> {
  return getAppointmentStaffIdsForBusiness(getSessionStaffId(session))
}

export async function getSalesAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const staffIds = await staffIdsForSession(session)

  const now = new Date()
  let start: Date, end: Date
  let intervalDates: Date[] = []

  switch (period) {
    case 'day':
      start = startOfDay(now)
      end = endOfDay(now)
      break
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 0 })
      end = endOfWeek(now, { weekStartsOn: 0 })
      intervalDates = eachDayOfInterval({ start, end })
      break
    case 'month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      intervalDates = eachDayOfInterval({ start, end })
      break
    case 'year':
      start = startOfYear(now)
      end = endOfYear(now)
      intervalDates = eachMonthOfInterval({ start, end })
      break
  }

  const allAppointments = await db.appointment.findMany({
    where: {
      staffId: { in: staffIds },
      startAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      appointmentServices: {
        include: {
          service: true,
        },
      },
    },
  })

  const completedAppointments = allAppointments.filter((apt) => apt.status === 'COMPLETED')

  const appointmentsWithPrice = allAppointments.filter(
    (apt) =>
      RECOGNIZED_REVENUE_STATUSES.includes(apt.status as 'CONFIRMED' | 'COMPLETED') &&
      Number(apt.totalPrice || 0) > 0,
  )
  const totalRevenue = appointmentsWithPrice.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0)
  const totalCompletedAppointments = completedAppointments.length
  const totalAppointments = allAppointments.length
  const averageValue = appointmentsWithPrice.length > 0 ? totalRevenue / appointmentsWithPrice.length : 0

  // Group by interval - include ALL appointments with price
  const salesByInterval: Record<string, { revenue: number; count: number }> = {}
  
  if (period === 'day') {
    const dateStr = format(now, 'yyyy-MM-dd')
    salesByInterval[dateStr] = {
      revenue: totalRevenue,
      count: totalAppointments,
    }
  } else {
    // Initialize all dates in interval with 0 revenue
    if (intervalDates.length > 0) {
      intervalDates.forEach((date) => {
        let dateStr: string
        if (period === 'week' || period === 'month') {
          dateStr = format(date, 'yyyy-MM-dd')
        } else {
          dateStr = format(date, 'yyyy-MM')
        }
        if (!salesByInterval[dateStr]) {
          salesByInterval[dateStr] = { revenue: 0, count: 0 }
        }
      })
    }
    
    // Add revenue from appointments
    appointmentsWithPrice.forEach((apt) => {
      let dateStr: string
      if (period === 'week' || period === 'month') {
        dateStr = format(new Date(apt.startAt), 'yyyy-MM-dd')
      } else {
        dateStr = format(new Date(apt.startAt), 'yyyy-MM')
      }
      
      if (!salesByInterval[dateStr]) {
        salesByInterval[dateStr] = { revenue: 0, count: 0 }
      }
      salesByInterval[dateStr].revenue += Number(apt.totalPrice || 0)
      salesByInterval[dateStr].count += 1
    })
  }

  return {
    period,
    start,
    end,
    totalRevenue,
    totalAppointments, // All appointments in period
    totalCompletedAppointments, // Only completed appointments
    averageValue,
    salesByInterval,
    intervalDates,
  }
}

export async function getAppointmentStats(period: 'month' | 'year' = 'month') {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const staffIds = await staffIdsForSession(session)

  const now = new Date()
  let start: Date, end: Date

  if (period === 'month') {
    start = startOfMonth(now)
    end = endOfMonth(now)
  } else {
    start = startOfYear(now)
    end = endOfYear(now)
  }

  const appointments = await db.appointment.findMany({
    where: {
      staffId: { in: staffIds },
      startAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      appointmentServices: {
        include: {
          service: true,
        },
      },
    },
  })

  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
    noShow: appointments.filter(a => a.status === 'NO_SHOW').length,
    booked: appointments.filter(a => a.status === 'BOOKED').length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
  }

  return stats
}

export async function getClientGrowth() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const now = new Date()
  const yearStart = startOfYear(now)
  const months = eachMonthOfInterval({ start: yearStart, end: now })

  const ownerId = getSessionStaffId(session)
  const tenantWhere = await tenantClientWhereClause(ownerId)
  const staffIds = await getAppointmentStaffIdsForBusiness(ownerId)

  const clients = await db.client.findMany({
    where: {
      AND: [
        tenantWhere,
        {
          appointments: {
            some: {
              staffId: { in: staffIds },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const growthByMonth: Record<string, number> = {}
  let cumulative = 0

  months.forEach((month) => {
    const monthClients = clients.filter(
      (c) => new Date(c.createdAt) <= month
    )
    cumulative = monthClients.length
    growthByMonth[format(month, 'yyyy-MM')] = cumulative
  })

  return {
    totalClients: clients.length,
    growthByMonth,
    months: months.map(m => format(m, 'MMM')),
  }
}

export async function getTopServices() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const staffIds = await staffIdsForSession(session)

  const now = new Date()
  const yearStart = startOfYear(now)

  const appointments = await db.appointment.findMany({
    where: {
      staffId: { in: staffIds },
      status: { in: [...RECOGNIZED_REVENUE_STATUSES] },
      startAt: {
        gte: yearStart,
      },
    },
    include: {
      appointmentServices: {
        include: {
          service: true,
        },
      },
    },
  })

  const serviceStats: Record<string, { name: string; count: number; revenue: number }> = {}

  appointments.forEach((apt) => {
    apt.appointmentServices.forEach((aptService) => {
      const serviceId = aptService.service.id
      const serviceName = aptService.service.name
      
      if (!serviceStats[serviceId]) {
        serviceStats[serviceId] = {
          name: serviceName,
          count: 0,
          revenue: 0,
        }
      }
      serviceStats[serviceId].count += 1
      serviceStats[serviceId].revenue += Number(aptService.priceAtTime || 0)
    })
  })

  return Object.values(serviceStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
}

export async function getMonthlyComparison() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const now = new Date()
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(now, 11 - i)
    return {
      month: format(month, 'yyyy-MM'),
      label: format(month, 'MMM yyyy'),
      start: startOfMonth(month),
      end: endOfMonth(month),
    }
  })

  const staffIds = await staffIdsForSession(session)

  const monthlyData = await Promise.all(
    last12Months.map(async ({ month, label, start, end }) => {
      const appointments = await db.appointment.findMany({
        where: {
          staffId: { in: staffIds },
          status: { in: [...RECOGNIZED_REVENUE_STATUSES] },
          startAt: {
            gte: start,
            lte: end,
          },
        },
      })

      const revenue = appointments.reduce(
        (sum, apt) => sum + Number(apt.totalPrice || 0),
        0
      )
      const count = appointments.length

      return {
        month,
        label,
        revenue,
        count,
      }
    })
  )

  return monthlyData
}

export async function getPeakTimes() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const staffIds = await staffIdsForSession(session)

  const now = new Date()
  const yearStart = startOfYear(now)

  const appointments = await db.appointment.findMany({
    where: {
      staffId: { in: staffIds },
      status: { in: [...RECOGNIZED_REVENUE_STATUSES] },
      startAt: {
        gte: yearStart,
      },
    },
  })

  const byMonth: Record<string, number> = {}
  const byDayOfWeek: Record<string, number> = {}
  const byHour: Record<string, number> = {}

  appointments.forEach((apt) => {
    const date = new Date(apt.startAt)
    const month = format(date, 'MMMM')
    const dayOfWeek = format(date, 'EEEE')
    const hour = date.getHours()

    byMonth[month] = (byMonth[month] || 0) + Number(apt.totalPrice || 0)
    byDayOfWeek[dayOfWeek] = (byDayOfWeek[dayOfWeek] || 0) + Number(apt.totalPrice || 0)
    byHour[hour] = (byHour[hour] || 0) + Number(apt.totalPrice || 0)
  })

  return {
    byMonth,
    byDayOfWeek,
    byHour,
  }
}
