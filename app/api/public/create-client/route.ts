import { createClientForBooking } from '@/app/actions/public-booking'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const CREATE_CLIENT_RATE_LIMIT_KEY = 'create-client'

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`${CREATE_CLIENT_RATE_LIMIT_KEY}:${ip}`)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const client = await createClientForBooking(body)
    return NextResponse.json({ client })
  } catch (error: any) {
    logError({ message: 'Create client failed', error, category: 'booking' })
    return NextResponse.json(
      { error: error.message || 'Failed to create client' },
      { status: 500 }
    )
  }
}
