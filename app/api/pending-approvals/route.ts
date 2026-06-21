import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only show appointments booked from the public website (not backend-created)
    const pendingAppointments = await db.appointment.findMany({
      where: {
        status: 'BOOKED',
        source: 'PUBLIC_BOOKING',
        staffId: getSessionStaffId(session), // Only appointments for this business
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        appointmentServices: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    })

    // Convert Decimal to number for serialization
    const appointments = pendingAppointments.map((apt) => ({
      ...apt,
      totalPrice: apt.totalPrice ? Number(apt.totalPrice) : 0,
    }))

    return NextResponse.json({ approvals: appointments })
  } catch (error: any) {
    console.error('Error fetching pending approvals:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}
