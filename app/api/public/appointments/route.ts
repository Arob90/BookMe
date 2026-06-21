import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    const date = searchParams.get('date')
    const startIso = searchParams.get('start')
    const endIso = searchParams.get('end')

    if (!businessId || !date) {
      return NextResponse.json(
        { error: 'businessId and date are required' },
        { status: 400 }
      )
    }

    let rangeStart: Date
    let rangeEnd: Date

    if (startIso && endIso) {
      rangeStart = new Date(startIso)
      rangeEnd = new Date(endIso)
      if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
        return NextResponse.json({ error: 'Invalid start or end time range' }, { status: 400 })
      }
      // Defensive: some clients can send start/end equal or inverted around DST; widen instead of 400.
      if (rangeEnd.getTime() <= rangeStart.getTime()) {
        rangeEnd = new Date(rangeStart.getTime() + 60 * 60 * 1000)
      }
      // Large service bundles can span many days; keep a generous cap to avoid abuse.
      const maxSpanMs = 400 * 24 * 60 * 60 * 1000
      if (rangeEnd.getTime() - rangeStart.getTime() > maxSpanMs) {
        return NextResponse.json({ error: 'Time range too large' }, { status: 400 })
      }
    } else {
      const [year, month, day] = date.split('-').map(Number)
      const selectedDate = new Date(year, month - 1, day)
      rangeStart = new Date(selectedDate)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd = new Date(selectedDate)
      rangeEnd.setHours(23, 59, 59, 999)
    }

    // Same blocking rule as bookAppointment: only BOOKED / CONFIRMED reserve the calendar.
    const appointments = await db.appointment.findMany({
      where: {
        staffId: businessId,
        status: { in: ['BOOKED', 'CONFIRMED'] },
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
      },
      orderBy: { startAt: 'asc' },
    })

    return NextResponse.json({ appointments })
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}
