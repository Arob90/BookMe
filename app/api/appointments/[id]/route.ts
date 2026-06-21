import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { updateAppointmentStatus, deleteAppointment, rescheduleAppointment } from '@/app/actions/appointments'
import { syncLoyaltyAppointmentsForClient } from '@/app/actions/loyalty'
import { appointmentServiceIncludeWithPipeline } from '@/lib/appointment-service-include'
import { attachPipelineToAppointmentServices } from '@/lib/appointment-pipeline-merge'

export const dynamic = 'force-dynamic'

async function getAppointmentById(id: string, sessionUserId: string) {
  const appointment = await db.appointment.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          loyaltyAccount: true,
        },
      },
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
        orderBy: {
          paidAt: 'desc',
        },
      },
      loyaltyTransactions: {
        select: {
          id: true,
          deltaPoints: true,
          reason: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!appointment || appointment.staffId !== sessionUserId) return null
  return appointment
}

async function serializeAppointment(appointment: NonNullable<Awaited<ReturnType<typeof getAppointmentById>>>) {
  const withPipeline = await attachPipelineToAppointmentServices(appointment)
  return {
    ...withPipeline,
    totalPrice: withPipeline.totalPrice ? Number(withPipeline.totalPrice) : null,
    appointmentServices: withPipeline.appointmentServices.map((as: any) => ({
      ...as,
      priceAtTime: as.priceAtTime ? Number(as.priceAtTime) : null,
      service: as.service ? {
        ...as.service,
        price: as.service.price ? Number(as.service.price) : null,
      } : null,
    })),
    payments: withPipeline.payments.map((p: any) => ({
      ...p,
      amount: p.amount ? Number(p.amount) : null,
    })),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staffId = getSessionStaffId(session)
    const appointment = await getAppointmentById(params.id, staffId)

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    await syncLoyaltyAppointmentsForClient(appointment.clientId, staffId)

    const clientWithLoyalty = await db.client.findUnique({
      where: { id: appointment.clientId },
      include: { loyaltyAccount: true },
    })

    const merged = {
      ...appointment,
      client: {
        ...appointment.client,
        loyaltyAccount: clientWithLoyalty?.loyaltyAccount ?? appointment.client.loyaltyAccount,
      },
    }

    return NextResponse.json(await serializeAppointment(merged))
  } catch (error: any) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch appointment' },
      { status: 500 }
    )
  }
}

/** Update appointment: status only or reschedule (startAt/endAt). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (body.status != null) {
      const status = body.status as 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'LATE_CANCEL' | 'NO_SHOW'
      const valid = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'LATE_CANCEL', 'NO_SHOW'].includes(status)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      const appointment = await updateAppointmentStatus(params.id, status)
      const apt = await getAppointmentById(appointment.id, getSessionStaffId(session))
      return NextResponse.json(apt ? await serializeAppointment(apt) : null)
    }

    if (body.startAt != null && body.endAt != null) {
      const appointment = await rescheduleAppointment({
        id: params.id,
        startAt: body.startAt,
        endAt: body.endAt,
      })
      const apt = await getAppointmentById(appointment.id, getSessionStaffId(session))
      return NextResponse.json(apt ? await serializeAppointment(apt) : null)
    }

    return NextResponse.json(
      { error: 'Provide status or startAt+endAt for reschedule' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

/** Delete appointment (cancel/remove). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteAppointment(params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}
