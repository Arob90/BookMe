import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const appointmentId = searchParams.get('appointmentId')

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        appointmentServices: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!appointment || !appointment.client) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Tenant isolation: only allow access to this business's appointments
    if (appointment.staffId !== getSessionStaffId(session)) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const client = appointment.client
    const services = appointment.appointmentServices.map((as: any) => as.service.name).join(', ')
    const startTime = formatDateTime(appointment.startAt)
    const totalPrice = Number(appointment.totalPrice || 0)

    // Format phone number (remove any non-digit characters except +)
    let phoneNumber = client.phone
    if (phoneNumber) {
      // Remove spaces, dashes, parentheses
      phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '')
    }

    const message = `Hi ${client.firstName}! 👋

Your appointment has been confirmed! ✅

📅 Date & Time: ${startTime}
💆 Services: ${services}
💰 Total: $${totalPrice.toFixed(2)}

We look forward to seeing you!

If you need to reschedule or have any questions, please contact us.

Thank you! 🙏`

    // Create WhatsApp URL
    let whatsappUrl = ''
    if (phoneNumber) {
      const encodedMessage = encodeURIComponent(message)
      whatsappUrl = `https://wa.me/${phoneNumber.replace(/\+/g, '')}?text=${encodedMessage}`
    }

    return NextResponse.json({
      message,
      phoneNumber,
      whatsappUrl,
    })
  } catch (error: any) {
    console.error('Error generating WhatsApp message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate WhatsApp message' },
      { status: 500 }
    )
  }
}
