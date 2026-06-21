import { bookAppointment } from '@/app/actions/public-booking'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logBookingFailure } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const BOOKING_RATE_LIMIT_KEY = 'booking'

export async function POST(request: Request) {
  try {
    // Rate limit by IP (or businessId from body to limit per-business abuse)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`${BOOKING_RATE_LIMIT_KEY}:${ip}`)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many booking requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const appointment = await bookAppointment(body)
    return NextResponse.json({ appointment })
  } catch (error: any) {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
    logBookingFailure({
      reason: error?.message ?? 'unknown',
      ip,
      error: error?.message,
    })
    return NextResponse.json(
      { error: error.message || 'Failed to book appointment' },
      { status: 500 }
    )
  }
}
