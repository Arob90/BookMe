/**
 * Helpers for calendar "date-only" values (holidays, etc.).
 *
 * `new Date('YYYY-MM-DD')` is UTC midnight; `toLocaleDateString()` uses local time, so the
 * same instant can appear as the previous calendar day in timezones behind UTC.
 *
 * We normalize to noon UTC for a given Y-M-D so the stored PostgreSQL DATE and all displays
 * match the date the user picked in <input type="date">.
 */

export function parseYmdToUtcNoon(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) throw new Error('Invalid date')
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) throw new Error('Invalid date')
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
}

/** Value for <input type="date"> from a Date / ISO string (uses UTC calendar date). */
export function formatUtcDateToYmd(value: Date | string): string {
  const x = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(x.getTime())) return ''
  const y = x.getUTCFullYear()
  const mo = String(x.getUTCMonth() + 1).padStart(2, '0')
  const d = String(x.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

/** Human-readable date from stored instant, always showing the UTC calendar day. */
export function formatUtcDateForDisplay(value: Date | string, locale?: string): string {
  const x = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(x.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(x)
}

/**
 * Compact label for holiday rows: weekday + month/day; omits year when the entry repeats yearly
 * so lists are not cluttered with the same year on every line.
 */
export function formatHolidayDateLabel(value: Date | string, repeatYearly: boolean, locale?: string): string {
  const x = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(x.getTime())) return '—'
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  if (!repeatYearly) opts.year = 'numeric'
  return new Intl.DateTimeFormat(locale, opts).format(x)
}

/** Today's date in the user's local calendar, for date input defaults. */
export function todayLocalYmd(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseHolidayDateInput(value: Date | string): Date {
  if (typeof value === 'string') {
    const t = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return parseYmdToUtcNoon(t)
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Invalid date')
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12, 0, 0))
  }
  throw new Error('Invalid date')
}
