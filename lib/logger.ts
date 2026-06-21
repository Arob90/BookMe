/**
 * Structured logging and error monitoring for production.
 * Use for: auth failures, booking failures, upload failures, suspicious requests.
 * Output is JSON-friendly so you can pipe to a log aggregator or error tracker (e.g. Sentry).
 */

type LogLevel = 'info' | 'warn' | 'error'

type LogContext = {
  message: string
  level: LogLevel
  category?: 'auth' | 'booking' | 'upload' | 'api' | 'authz'
  error?: string
  stack?: string
  [key: string]: unknown
}

function formatPayload(ctx: LogContext): string {
  const payload = {
    timestamp: new Date().toISOString(),
    level: ctx.level,
    message: ctx.message,
    ...(ctx.category && { category: ctx.category }),
    ...(ctx.error && { error: ctx.error }),
    ...(ctx.stack && { stack: ctx.stack }),
    ...Object.fromEntries(
      Object.entries(ctx).filter(
        ([k]) => !['message', 'level', 'category', 'error', 'stack'].includes(k)
      )
    ),
  }
  return JSON.stringify(payload)
}

function log(ctx: LogContext) {
  const out = formatPayload(ctx)
  if (ctx.level === 'error') {
    console.error(out)
  } else if (ctx.level === 'warn') {
    console.warn(out)
  } else {
    console.log(out)
  }
  // Optional: send to Sentry/LogRocket (e.g. if process.env.SENTRY_DSN)
  // captureException(ctx)
}

export function logAuthFailure(opts: {
  reason: string
  email?: string | null
  ip?: string
  status?: number
}) {
  log({
    level: 'warn',
    message: 'Auth failure',
    category: 'auth',
    ...opts,
  })
}

export function logAuthSuccess(opts: { userId: string; email?: string | null; ip?: string }) {
  log({
    level: 'info',
    message: 'Auth success',
    category: 'auth',
    ...opts,
  })
}

export function logBookingFailure(opts: {
  reason: string
  businessId?: string
  ip?: string
  error?: string
}) {
  log({
    level: 'warn',
    message: 'Booking failure',
    category: 'booking',
    ...opts,
  })
}

export function logUploadFailure(opts: {
  reason: string
  userId?: string
  type?: string
  error?: string
}) {
  log({
    level: 'warn',
    message: 'Upload failure',
    category: 'upload',
    ...opts,
  })
}

export function logSuspiciousRequest(opts: {
  reason: string
  path?: string
  method?: string
  ip?: string
  status?: number
}) {
  log({
    level: 'warn',
    message: 'Suspicious request',
    category: 'api',
    ...opts,
  })
}

export function logError(opts: {
  message: string
  error?: unknown
  category?: LogContext['category']
  [key: string]: unknown
}) {
  const error = opts.error
  const errorMessage = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  log({
    level: 'error',
    message: opts.message,
    category: opts.category,
    error: errorMessage,
    stack,
    ...Object.fromEntries(
      Object.entries(opts).filter(
        ([k]) => !['message', 'error', 'category'].includes(k)
      )
    ),
  })
}
