'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { invoiceBalanceDue, netPaymentsTotal } from '@/lib/payment-net'
import { awardLoyaltyForAppointmentIfEligible } from '@/app/actions/loyalty'

const createPaymentSchema = z.object({
  appointmentId: z.string(),
  clientId: z.string(),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'BANK', 'WALLET', 'WIRE']).optional(),
  paymentAccountId: z.string().optional(),
  notes: z.string().optional(),
})

export async function createPayment(data: z.infer<typeof createPaymentSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = createPaymentSchema.parse(data)

  // Verify appointment exists, belongs to client, and belongs to this business
  const appointment = await db.appointment.findFirst({
    where: {
      id: validated.appointmentId,
      staffId: getSessionStaffId(session), // Verify appointment belongs to this business
    },
  })

  if (!appointment) throw new Error('Appointment not found or does not belong to this business')
  if (appointment.clientId !== validated.clientId) {
    throw new Error('Appointment does not belong to this client')
  }

  // Create payment
  const payment = await db.payment.create({
    data: {
      appointmentId: validated.appointmentId,
      clientId: validated.clientId,
      amount: validated.amount,
      isRefund: false,
      paymentMethod: validated.paymentMethod,
      paymentAccountId: validated.paymentAccountId,
      notes: validated.notes,
    },
    include: {
      appointment: true,
    },
  })

  await awardLoyaltyForAppointmentIfEligible({
    appointmentId: validated.appointmentId,
    staffId: getSessionStaffId(session),
    reason: 'Invoice paid in full',
  })

  revalidatePath('/app/clients')
  revalidatePath(`/app/clients/${validated.clientId}`)
  revalidatePath('/app/calendar')
  revalidatePath('/app/dashboard')
  // Revalidate notifications by invalidating the API route cache
  revalidatePath('/api/notifications')
  // Convert Decimal to number for serialization
  return {
    ...payment,
    amount: payment.amount ? Number(payment.amount) : null,
    appointment: payment.appointment ? {
      ...payment.appointment,
      totalPrice: payment.appointment.totalPrice ? Number(payment.appointment.totalPrice) : null,
    } : null,
  }
}

const UPLOAD_PREFIX = '/uploads/bookme/'

function assertAllowedAttachmentUrls(urls: string[]) {
  for (const url of urls) {
    if (!url.startsWith(UPLOAD_PREFIX) || url.includes('..')) {
      throw new Error('Invalid attachment path')
    }
    const name = url.slice(UPLOAD_PREFIX.length)
    if (!name || name.length > 400 || !/^[a-zA-Z0-9._-]+$/.test(name)) {
      throw new Error('Invalid attachment path')
    }
  }
}

const createRefundSchema = z.object({
  appointmentId: z.string(),
  clientId: z.string(),
  amount: z.number().positive('Refund amount must be positive'),
  notes: z.string().max(5000).optional(),
  attachmentUrls: z.array(z.string()).max(15).optional(),
})

export async function createRefund(data: z.infer<typeof createRefundSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = createRefundSchema.parse(data)
  const urls = validated.attachmentUrls ?? []
  if (urls.length) assertAllowedAttachmentUrls(urls)

  const appointment = await db.appointment.findFirst({
    where: {
      id: validated.appointmentId,
      staffId: getSessionStaffId(session),
    },
    include: {
      payments: { select: { amount: true, isRefund: true } },
    },
  })

  if (!appointment) throw new Error('Appointment not found or does not belong to this business')
  if (appointment.clientId !== validated.clientId) {
    throw new Error('Appointment does not belong to this client')
  }

  const netPaid = netPaymentsTotal(appointment.payments)
  if (netPaid <= 0) throw new Error('Nothing has been paid yet; there is nothing to refund.')
  if (validated.amount > netPaid + 0.009) {
    throw new Error(`Refund cannot exceed net paid (${netPaid.toFixed(2)}).`)
  }

  const payment = await db.payment.create({
    data: {
      appointmentId: validated.appointmentId,
      clientId: validated.clientId,
      amount: validated.amount,
      isRefund: true,
      paymentMethod: null,
      paymentAccountId: null,
      notes: validated.notes ?? null,
      attachmentUrls: urls,
    },
    include: {
      appointment: true,
    },
  })

  revalidatePath('/app/clients')
  revalidatePath(`/app/clients/${validated.clientId}`)
  revalidatePath('/app/calendar')
  revalidatePath('/app/dashboard')
  revalidatePath('/api/notifications')

  return {
    ...payment,
    amount: payment.amount ? Number(payment.amount) : null,
    appointment: payment.appointment
      ? {
          ...payment.appointment,
          totalPrice: payment.appointment.totalPrice ? Number(payment.appointment.totalPrice) : null,
        }
      : null,
  }
}

export async function getPendingBills(clientId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Accepted or completed appointments that may still carry a balance (not BOOKED)
  const appointments = await db.appointment.findMany({
    where: {
      clientId,
      staffId: getSessionStaffId(session), // Only appointments for this business
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      payments: {
        select: {
          amount: true,
          isRefund: true,
        },
      },
    },
    orderBy: { startAt: 'desc' },
  })

  // Calculate pending bills
  const pendingBills = appointments.map((apt) => {
    const totalPrice = Number(apt.totalPrice)
    const netPaid = netPaymentsTotal(apt.payments)
    const pending = invoiceBalanceDue(totalPrice, apt.payments)

    return {
      appointmentId: apt.id,
      startAt: apt.startAt,
      totalPrice,
      totalPaid: netPaid,
      pending,
      isPaid: pending <= 0,
    }
  }).filter((bill) => bill.pending > 0) // Only return bills with pending amount

  return pendingBills
}

export async function getClientPendingBalance(clientId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const pendingBills = await getPendingBills(clientId)
  const totalPending = pendingBills.reduce((sum, bill) => sum + bill.pending, 0)

  return {
    totalPending,
    pendingBillsCount: pendingBills.length,
    hasPendingBills: pendingBills.length > 0,
  }
}

export async function getPayments(clientId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const payments = await db.payment.findMany({
    where: {
      clientId,
      appointment: {
        staffId: getSessionStaffId(session), // Only payments for this business's appointments
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
  })

  // Convert Decimal to number for serialization
  return payments.map((payment) => ({
    ...payment,
    amount: payment.amount ? Number(payment.amount) : null,
    appointment: payment.appointment ? {
      ...payment.appointment,
      totalPrice: payment.appointment.totalPrice ? Number(payment.appointment.totalPrice) : null,
    } : null,
  }))
}

export async function getBusinessPendingBillsSummary(options?: { limit?: number }) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const limit = Math.max(1, Math.min(500, options?.limit ?? 200))

  const appointments = await db.appointment.findMany({
    where: {
      staffId: getSessionStaffId(session),
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      payments: {
        select: {
          amount: true,
          isRefund: true,
        },
      },
    },
    orderBy: { startAt: 'desc' },
    take: limit,
  })

  let pendingBillsCount = 0
  let totalPending = 0

  for (const apt of appointments) {
    const totalPrice = Number(apt.totalPrice)
    const pending = invoiceBalanceDue(totalPrice, apt.payments)
    if (pending > 0) {
      pendingBillsCount += 1
      totalPending += pending
    }
  }

  return {
    pendingBillsCount,
    totalPending,
  }
}

export async function getBusinessPayments(options?: { limit?: number }) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const limit = Math.max(1, Math.min(500, options?.limit ?? 100))
  const staffId = getSessionStaffId(session)

  const payments = await db.payment.findMany({
    where: {
      appointment: {
        staffId,
      },
    },
    include: {
      appointment: {
        select: { id: true, startAt: true, totalPrice: true },
      },
      client: {
        select: {
          id: true,
          type: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
      },
    },
    orderBy: { paidAt: 'desc' },
    take: limit,
  })

  return payments.map((p) => ({
    ...p,
    amount: p.amount ? Number(p.amount) : null,
    appointment: p.appointment
      ? {
          ...p.appointment,
          totalPrice: p.appointment.totalPrice ? Number(p.appointment.totalPrice) : null,
        }
      : null,
  }))
}
