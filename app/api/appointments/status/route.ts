import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateAppointmentStatus } from '@/app/actions/appointments'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }

    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED', 'LATE_CANCEL', 'NO_SHOW'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const appointment = await updateAppointmentStatus(
      id,
      status as 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'LATE_CANCEL' | 'NO_SHOW'
    )

    // Serialize for JSON (Decimal -> number)
    const serialized = {
      ...appointment,
      totalPrice: appointment.totalPrice != null ? Number(appointment.totalPrice) : null,
    }

    return NextResponse.json({ appointment: serialized })
  } catch (error: any) {
    const message = error?.message ?? 'Failed to update appointment status'
    if (message.includes('not found') || message.includes('does not belong')) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
