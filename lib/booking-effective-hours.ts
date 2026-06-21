/**
 * Shared rules for public booking: weekly hours + holiday closed / special hours.
 * Used by /api/public/business-hours, /book, and bookAppointment validation.
 */

export type DayHoursShape = { start: string; end: string }

const DEFAULT_BUSINESS_HOURS: Record<string, DayHoursShape> = {
  MONDAY: { start: '09:00', end: '18:00' },
  TUESDAY: { start: '09:00', end: '18:00' },
  WEDNESDAY: { start: '09:00', end: '18:00' },
  THURSDAY: { start: '09:00', end: '18:00' },
  FRIDAY: { start: '09:00', end: '18:00' },
  SATURDAY: { start: '09:00', end: '18:00' },
  SUNDAY: { start: '09:00', end: '18:00' },
}

/** Normalize settings JSON (mixed-case keys, `close` alias) for server + shared rules. */
export function normalizeBusinessHoursFromSettings(raw: unknown): Record<string, DayHoursShape> {
  const out: Record<string, DayHoursShape> = { ...DEFAULT_BUSINESS_HOURS }
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = k.toUpperCase().trim()
    if (!v || typeof v !== 'object') continue
    const o = v as { start?: unknown; end?: unknown; close?: unknown }
    const start = o.start != null ? String(o.start).trim() : ''
    const end = o.end != null ? String(o.end).trim() : o.close != null ? String(o.close).trim() : ''
    if (start && end) out[key] = { start, end }
  }
  return out
}

export type PublicHolidayLite = {
  /** ISO string (from JSON); calendar date is read in UTC for month/day matching. */
  date: string
  name: string
  repeatYearly: boolean
  isOpen: boolean
  openAt: string | null
  closeAt: string | null
}

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

export function getDayNameFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 'MONDAY'
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return DAY_NAMES[dt.getUTCDay()]
}

function holidayMatchesCalendarDate(h: PublicHolidayLite, ymd: string): boolean {
  const [sy, sm, sd] = ymd.split('-').map(Number)
  const d = new Date(h.date)
  if (Number.isNaN(d.getTime())) return false
  const hy = d.getUTCFullYear()
  const hm = d.getUTCMonth() + 1
  const hd = d.getUTCDate()
  if (h.repeatYearly) return hm === sm && hd === sd
  return hy === sy && hm === sm && hd === sd
}

export function findHolidayForYmd(holidays: PublicHolidayLite[], ymd: string): PublicHolidayLite | null {
  for (const h of holidays) {
    if (holidayMatchesCalendarDate(h, ymd)) return h
  }
  return null
}

export type EffectiveSlotResult = {
  closed: boolean
  slotWindow: { start: string; end: string } | null
  holidayName?: string
  reason?: string
}

export function computeEffectiveSlotWindow(
  ymd: string,
  businessHours: Record<string, DayHoursShape> | null,
  businessDays: string[],
  holidays: PublicHolidayLite[]
): EffectiveSlotResult {
  const h = findHolidayForYmd(holidays, ymd)
  if (h) {
    if (!h.isOpen) {
      return {
        closed: true,
        slotWindow: null,
        holidayName: h.name,
        reason: `${h.name} — closed`,
      }
    }
    if (h.openAt && h.closeAt) {
      return {
        closed: false,
        slotWindow: { start: h.openAt, end: h.closeAt },
        holidayName: h.name,
      }
    }
  }

  const dayName = getDayNameFromYmd(ymd)
  const openDays =
    businessDays?.length > 0
      ? businessDays
      : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  if (!openDays.includes(dayName)) {
    return { closed: true, slotWindow: null, reason: 'Closed this day' }
  }

  const bh = businessHours?.[dayName]
  if (!bh?.start || !bh?.end) {
    return { closed: true, slotWindow: null, reason: 'No hours configured' }
  }
  return { closed: false, slotWindow: { start: bh.start, end: bh.end } }
}

/** "HH:MM" / "H:MM" → minutes from midnight */
export function parseHHMMToMinutes(s: string | undefined | null): number | null {
  if (s == null || typeof s !== 'string') return null
  const t = s.trim()
  if (!t.includes(':')) return null
  const parts = t.split(':').map((p) => Number(p))
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null
  const h = parts[0]
  const m = parts[1]
  if (h < 0 || h > 47 || m < 0 || m > 59) return null
  return h * 60 + m
}

export function getYmdInTimezone(d: Date, timeZone: string): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = p.find((x) => x.type === 'year')?.value
  const m = p.find((x) => x.type === 'month')?.value
  const day = p.find((x) => x.type === 'day')?.value
  if (!y || !m || !day) return ''
  return `${y}-${m}-${day}`
}

export function getClockMinutesInTimezone(d: Date, timeZone: string): number {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const h = p.find((x) => x.type === 'hour')?.value
  const mm = p.find((x) => x.type === 'minute')?.value
  const hh = h ? parseInt(h, 10) : 0
  const m = mm ? parseInt(mm, 10) : 0
  return hh * 60 + m
}
