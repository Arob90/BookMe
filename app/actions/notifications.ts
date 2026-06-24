'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/authz'
import { effectiveRights, rightForNotificationType } from '@/lib/staff-rights'
import { endOfDay, addMinutes, format } from 'date-fns'
import { getBirthdayOccurrenceInCurrentMonthFromToday, isBirthdayToday } from '@/lib/utils'
import { getSessionStaffId } from '@/lib/session-staff'
import { tenantClientWhereClause } from '@/lib/client-tenant'
import { invoiceBalanceDue } from '@/lib/payment-net'

export interface Notification {
  id: string
  type: 'upcoming_appointment' | 'unpaid_payment' | 'low_inventory' | 'birthday' | 'account_request'
  title: string
  message: string
  link?: string
  priority: 'high' | 'medium' | 'low'
  createdAt: Date
}

export async function getNotifications(): Promise<Notification[]> {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const notifications: Notification[] = []
  const now = new Date()

  // 1. Check for upcoming appointments (within next hour) for this business
  const upcomingThreshold = addMinutes(now, 60)
  const upcomingAppointments = await db.appointment.findMany({
    where: {
      staffId: getSessionStaffId(session), // Only appointments for this business
      status: { in: ['BOOKED', 'CONFIRMED'] },
      startAt: {
        gte: now,
        lte: upcomingThreshold,
      },
    },
    include: {
      client: true,
      appointmentServices: {
        include: {
          service: true,
        },
      },
    },
    orderBy: {
      startAt: 'asc',
    },
  })

  for (const apt of upcomingAppointments) {
    const minutesUntil = Math.round((new Date(apt.startAt).getTime() - now.getTime()) / (1000 * 60))
    notifications.push({
      id: `upcoming-${apt.id}`,
      type: 'upcoming_appointment',
      title: 'Upcoming Appointment',
      message: `${apt.client.firstName} ${apt.client.lastName} - ${format(new Date(apt.startAt), 'h:mm a')} (in ${minutesUntil} min)`,
      link: `/app/calendar?date=${format(new Date(apt.startAt), 'yyyy-MM-dd')}&appointmentId=${apt.id}`,
      priority: minutesUntil <= 30 ? 'high' : 'medium',
      createdAt: new Date(apt.startAt),
    })
  }

  // 2. Check for unpaid appointments (accepted + not fully paid only — not BOOKED / pending acceptance)
  const todayEnd = endOfDay(now)

  // Get appointments through end of today with unpaid balance; CONFIRMED = you've accepted, COMPLETED = finished but may still owe
  const unpaidAppointments = await db.appointment.findMany({
    where: {
      staffId: getSessionStaffId(session), // Only appointments for this business
      startAt: {
        lte: todayEnd, // Include today and past appointments
      },
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      client: true,
      payments: {
        select: {
          amount: true,
          isRefund: true,
        },
      },
    },
  })

  // Group unpaid appointments by client
  const unpaidByClient: Record<string, { client: any; appointments: any[] }> = {}

  for (const apt of unpaidAppointments) {
    const totalPrice = Number(apt.totalPrice || 0)
    if (totalPrice === 0) continue

    const remaining = invoiceBalanceDue(totalPrice, apt.payments)

    // Use a small tolerance (0.01) to account for floating point precision issues
    // If remaining is less than 1 cent, consider it fully paid
    if (remaining > 0.01) {
      const clientId = apt.clientId
      if (!unpaidByClient[clientId]) {
        unpaidByClient[clientId] = {
          client: apt.client,
          appointments: [],
        }
      }
      unpaidByClient[clientId].appointments.push({
        ...apt,
        remaining,
      })
    }
  }

  // Create notifications for each client with unpaid appointments
  for (const [clientId, data] of Object.entries(unpaidByClient)) {
    // Only show appointments from today or past (not future)
    const todayOrPastAppointments = data.appointments.filter(apt => {
      const aptDate = new Date(apt.startAt)
      return aptDate <= todayEnd
    })
    
    if (todayOrPastAppointments.length > 0) {
      const totalUnpaidToday = todayOrPastAppointments.reduce((sum, apt) => sum + apt.remaining, 0)
      
      notifications.push({
        id: `unpaid-${clientId}-${format(now, 'yyyy-MM-dd')}`,
        type: 'unpaid_payment',
        title: 'Unpaid Appointment(s)',
        message: `${data.client.firstName} ${data.client.lastName} - ${todayOrPastAppointments.length} appointment(s) with $${totalUnpaidToday.toFixed(2)} remaining`,
        link: `/app/clients/${clientId}`,
        priority: 'high',
        createdAt: now,
      })
    }
  }

  // 3. Birthdays in the current month: today + remaining days only (past dates this month excluded)
  const birthdayTenant = await tenantClientWhereClause(getSessionStaffId(session))
  const allClients = await db.client.findMany({
    where: {
      AND: [
        birthdayTenant,
        {
          birthday: {
            not: null,
          },
        },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthday: true,
    },
  })

  const birthdayRows: { client: (typeof allClients)[number]; occurrence: Date }[] = []
  for (const client of allClients) {
    const occurrence = getBirthdayOccurrenceInCurrentMonthFromToday(client.birthday, now)
    if (occurrence) {
      birthdayRows.push({ client, occurrence })
    }
  }
  birthdayRows.sort((a, b) => {
    const t = a.occurrence.getTime() - b.occurrence.getTime()
    if (t !== 0) return t
    return `${a.client.lastName} ${a.client.firstName}`.localeCompare(
      `${b.client.lastName} ${b.client.firstName}`
    )
  })

  for (const { client, occurrence } of birthdayRows) {
    const todayB = isBirthdayToday(client.birthday)
    notifications.push({
      id: `birthday-${client.id}-${format(occurrence, 'yyyy-MM-dd')}`,
      type: 'birthday',
      title: todayB ? '🎉 Birthday today!' : 'Birthday this month',
      message: todayB
        ? `${client.firstName} ${client.lastName} is celebrating today!`
        : `${client.firstName} ${client.lastName} — ${format(occurrence, 'MMMM d')}`,
      link: `/app/clients/${client.id}`,
      priority: todayB ? 'high' : 'medium',
      createdAt: occurrence,
    })
  }

  // 4. Check for low inventory items for this business
  // First get all active items, then filter in memory for quantity <= minQuantity
  const allActiveItems = await db.inventoryItem.findMany({
    where: {
      staffId: getSessionStaffId(session), // Only inventory for this business
      isActive: true,
      isArchived: false,
    },
    include: {
      inventoryCategory: true,
    },
  })

  const lowStockItems = allActiveItems.filter(item => item.quantity <= item.minQuantity).sort((a, b) => a.quantity - b.quantity)

  if (lowStockItems.length > 0) {
    // Group by category or show top 5
    const itemsToShow = lowStockItems.slice(0, 5)
    const remainingCount = lowStockItems.length - itemsToShow.length

    if (itemsToShow.length === 1) {
      notifications.push({
        id: `low-inventory-${itemsToShow[0].id}`,
        type: 'low_inventory',
        title: 'Low Stock Alert',
        message: `${itemsToShow[0].name} - ${itemsToShow[0].quantity} ${itemsToShow[0].unit} remaining (min: ${itemsToShow[0].minQuantity})`,
        link: `/app/inventory?filter=lowStock&itemId=${itemsToShow[0].id}`,
        priority: itemsToShow[0].quantity === 0 ? 'high' : 'medium',
        createdAt: now,
      })
    } else {
      notifications.push({
        id: 'low-inventory-multiple',
        type: 'low_inventory',
        title: 'Low Stock Alert',
        message: `${itemsToShow.length} item(s) need restocking${remainingCount > 0 ? ` (+${remainingCount} more)` : ''}`,
        link: '/app/inventory?filter=lowStock',
        priority: itemsToShow.some(item => item.quantity === 0) ? 'high' : 'medium',
        createdAt: now,
      })
    }
  }

  // 5. Pending new-business signups (super admin only) — link to /app/accounts
  if (isSuperAdmin(session.user.email)) {
    const pendingAccountRequests = await db.pendingAccountRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    for (const req of pendingAccountRequests) {
      notifications.push({
        id: `account-request-${req.id}`,
        type: 'account_request',
        title: 'New account request',
        message: `${req.firstName} ${req.lastName} — ${req.businessName} (${req.email})`,
        link: '/app/accounts',
        priority: 'high',
        createdAt: req.createdAt,
      })
    }
  }

  // Sort by priority and time
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  notifications.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  // Staff only see notification types their rights allow.
  const rights = effectiveRights({
    role: (session.user as { role?: string }).role,
    isSuperAdmin: isSuperAdmin(session.user.email),
    staffRights: (session.user as { staffRights?: unknown }).staffRights,
  })
  return notifications.filter((n) => {
    const need = rightForNotificationType(n.type)
    return !need || rights[need]
  })
}
