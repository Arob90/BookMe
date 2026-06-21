import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAuthFailure, logSuspiciousRequest } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'

  let email: string | null = null
  try {
    const body = await request.json()
    email = body?.email ?? null
  } catch {
    logSuspiciousRequest({ reason: 'Invalid JSON body', path: '/api/auth/login', method: 'POST', ip })
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const rateLimit = await checkRateLimit(`login:${ip}:${email ?? ''}`)
  if (!rateLimit.allowed) {
    logAuthFailure({ reason: 'rate_limited', email, ip, status: 429 })
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // Actual sign-in is handled by NextAuth credentials flow; this route is for rate-limiting only.
  return NextResponse.json({ success: true })
}
