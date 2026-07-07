import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Duration unit type and helpers for services (minutes, hours, days, months, years)
export type DurationUnit = 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'

const MINUTES_PER_UNIT: Record<DurationUnit, number> = {
  MINUTES: 1,
  HOURS: 60,
  DAYS: 24 * 60,
  WEEKS: 7 * 24 * 60,
  MONTHS: 30 * 24 * 60,
  YEARS: 365 * 24 * 60,
}

/** Convert duration amount + unit to total minutes (for storage/scheduling). */
export function durationToMinutes(amount: number, unit: DurationUnit): number {
  return Math.round(amount * MINUTES_PER_UNIT[unit])
}

/** Get display amount for a given unit from total minutes (e.g. 120 min + HOURS => 2). */
export function minutesToDurationAmount(totalMinutes: number, unit: DurationUnit): number {
  const per = MINUTES_PER_UNIT[unit]
  const value = totalMinutes / per
  return unit === 'MINUTES' ? Math.round(value) : Math.round(value * 100) / 100
}

/** Format duration for display (e.g. "30 min", "2 hr", "1 day"). */
export function formatDuration(
  totalMinutes: number,
  unit?: DurationUnit | string | null
): string {
  const u = (unit || 'MINUTES') as DurationUnit
  const amount = minutesToDurationAmount(totalMinutes, u)
  const labels: Record<DurationUnit, { singular: string; plural: string }> = {
    MINUTES: { singular: 'min', plural: 'min' },
    HOURS: { singular: 'hr', plural: 'hr' },
    DAYS: { singular: 'day', plural: 'days' },
    WEEKS: { singular: 'wk', plural: 'wks' },
    MONTHS: { singular: 'mo', plural: 'mo' },
    YEARS: { singular: 'yr', plural: 'yr' },
  }
  const { singular, plural } = labels[u]
  const label = amount === 1 ? singular : plural
  return `${amount} ${label}`
}

/**
 * Calendar slot length in minutes for one service line (matches server booking rules).
 * `durationMinutes` is the stored value on Service / AppointmentService (calendar minutes).
 */
export function getSchedulableSlotMinutes(
  durationMinutes: number,
  durationUnit?: string | null
): number {
  const minutes = Number(durationMinutes || 0)
  if (!Number.isFinite(minutes) || minutes <= 0) return 0
  const unit = String(durationUnit || 'MINUTES').toUpperCase()
  if (unit === 'DAYS' || unit === 'WEEKS' || unit === 'MONTHS' || unit === 'YEARS') return 60
  return Math.min(minutes, 8 * 60)
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

/** Format structured address for display. */
export function formatAddress(client: {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}): string {
  const parts = [
    client.addressLine1,
    client.addressLine2,
    [client.city, client.state].filter(Boolean).join(', '),
    client.postalCode,
    client.country,
  ].filter(Boolean)
  return parts.join(', ') || ''
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || '?'}${lastName?.[0] || '?'}`.toUpperCase()
}

/** Display name for a business user (admin / staff). */
export function getStaffDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
  userName?: string | null
  email?: string | null
}): string {
  const first = user.firstName?.trim() || ''
  const last = user.lastName?.trim() || ''
  if (first && last) return `${first} ${last}`
  if (first) return first
  const un = user.userName?.trim()
  if (un) return un
  return user.email?.trim() || 'User'
}

/** Two-letter initials for staff/admin avatars on pipeline cards. */
export function getStaffUserInitials(user: {
  firstName?: string | null
  lastName?: string | null
  userName?: string | null
  email?: string | null
}): string {
  const first = user.firstName?.trim() || ''
  const last = user.lastName?.trim() || ''
  if (first && last) return getInitials(first, last)
  if (first.length >= 2) return first.slice(0, 2).toUpperCase()
  if (first) return `${first[0]}?`.toUpperCase()
  const un = user.userName?.trim()
  if (un && un.length >= 2) return un.slice(0, 2).toUpperCase()
  if (un) return `${un[0]}?`.toUpperCase()
  const local = user.email?.split('@')[0]?.trim() || ''
  if (local.length >= 2) return local.slice(0, 2).toUpperCase()
  return (local[0] || '?').toUpperCase()
}

/** Stable gradient class index for assignee avatar rings (from user id). */
export function staffAssigneeAvatarGradientClass(userId: string): string {
  const gradients = [
    'from-violet-100 to-violet-200 text-violet-900 border-violet-200/80',
    'from-sky-100 to-sky-200 text-sky-900 border-sky-200/80',
    'from-amber-100 to-amber-200 text-amber-900 border-amber-200/80',
    'from-emerald-100 to-emerald-200 text-emerald-900 border-emerald-200/80',
    'from-rose-100 to-rose-200 text-rose-900 border-rose-200/80',
    'from-indigo-100 to-indigo-200 text-indigo-900 border-indigo-200/80',
  ]
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0
  return gradients[Math.abs(h) % gradients.length]
}

/** Display name for a client (individual or company). */
export function getClientDisplayName(client: {
  type?: string
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}): string {
  if (client.type === 'COMPANY') {
    return client.companyName?.trim() || client.firstName?.trim() || 'Company'
  }
  const first = client.firstName?.trim() || ''
  const last = client.lastName?.trim() || ''
  return [first, last].filter(Boolean).join(' ') || '—'
}

/** Initials for avatar display (handles company vs individual). */
export function getClientInitials(client: {
  type?: string
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}): string {
  if (client.type === 'COMPANY' && client.companyName) {
    const name = client.companyName.trim()
    if (name.length >= 2) return name.slice(0, 2).toUpperCase()
    return name.slice(0, 1).toUpperCase() || '?'
  }
  return getInitials(client.firstName || '', client.lastName || '')
}

/** Company name when client (person) belongs to a company. */
export function getClientCompanyName(client: {
  company?: { companyName?: string | null; firstName?: string | null } | null
  companyId?: string | null
}): string | null {
  if (!client.company) return null
  return client.company.companyName?.trim() || client.company.firstName?.trim() || null
}

/** Middle segment of generated client ID: founding year for companies, birth year for people, else 0000. */
export function getClientIdYearSegment(
  type: string | null | undefined,
  birthday: Date | string | null | undefined,
  companyFoundedAt: Date | string | null | undefined
): string {
  if (type === 'COMPANY' && companyFoundedAt) {
    const d = typeof companyFoundedAt === 'string' ? new Date(companyFoundedAt) : companyFoundedAt
    if (!isNaN(d.getTime())) return String(d.getFullYear())
  }
  if (birthday) {
    const bday = typeof birthday === 'string' ? new Date(birthday) : birthday
    if (!isNaN(bday.getTime())) return String(bday.getFullYear())
  }
  return '0000'
}

/** YYYY-MM-DD for sort / tie-break when numbering clients that share initials + year segment. */
export function getClientIdDateSortKey(
  type: string | null | undefined,
  birthday: Date | string | null | undefined,
  companyFoundedAt: Date | string | null | undefined
): string {
  if (type === 'COMPANY' && companyFoundedAt) {
    const d = typeof companyFoundedAt === 'string' ? new Date(companyFoundedAt) : companyFoundedAt
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return ''
  }
  if (!birthday) return ''
  const d = typeof birthday === 'string' ? new Date(birthday) : birthday
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export type ClientIdPeer = {
  id?: string
  firstName: string
  lastName: string
  birthday?: Date | string | null | undefined
  companyFoundedAt?: Date | string | null | undefined
  type?: string | null
}

export function generateClientId(
  firstName: string,
  lastName: string,
  birthday: Date | string | null | undefined,
  allClients: ClientIdPeer[],
  currentClientId?: string,
  options?: { type?: string | null; companyFoundedAt?: Date | string | null | undefined }
): string {
  const firstInitial = firstName?.[0]?.toUpperCase() || 'X'
  const lastInitial = lastName?.[0]?.toUpperCase() || 'X'

  const type = options?.type
  const companyFoundedAt = options?.companyFoundedAt
  const yearSegment = getClientIdYearSegment(type, birthday, companyFoundedAt)

  const currentDateKey = getClientIdDateSortKey(type, birthday, companyFoundedAt)

  // Count how many clients have the same initials and year segment
  const samePatternClients = allClients.filter((client) => {
    const clientFirstInitial = client.firstName?.[0]?.toUpperCase() || 'X'
    const clientLastInitial = client.lastName?.[0]?.toUpperCase() || 'X'
    const clientYearSegment = getClientIdYearSegment(
      client.type,
      client.birthday,
      client.companyFoundedAt
    )
    return (
      clientFirstInitial === firstInitial &&
      clientLastInitial === lastInitial &&
      clientYearSegment === yearSegment
    )
  })

  // Sort by creation order (or by name if no ID) to ensure consistent numbering
  samePatternClients.sort((a, b) => {
    if (a.id && b.id) {
      return a.id.localeCompare(b.id)
    }
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
    if (nameA !== nameB) return nameA.localeCompare(nameB)
    return getClientIdDateSortKey(a.type, a.birthday, a.companyFoundedAt).localeCompare(
      getClientIdDateSortKey(b.type, b.birthday, b.companyFoundedAt)
    )
  })

  // Find the index of the current client (1-based, never 0)
  let number = Math.max(1, samePatternClients.length)
  if (currentClientId) {
    const index = samePatternClients.findIndex((client) => client.id === currentClientId)
    if (index >= 0) {
      number = index + 1
    }
  } else {
    // If no ID, try to match by name and date anchor (birthday or company founded)
    const index = samePatternClients.findIndex(
      (client) =>
        client.firstName === firstName &&
        client.lastName === lastName &&
        getClientIdDateSortKey(client.type, client.birthday, client.companyFoundedAt) === currentDateKey
    )
    if (index >= 0) {
      number = index + 1
    } else {
      // If not found, it's a new client, add 1 to the count
      number = samePatternClients.length + 1
    }
  }

  return `${firstInitial}${lastInitial}-${yearSegment}-${number}`
}

export function getDaysUntilBirthday(birthday: Date | string | null | undefined): number | null {
  if (!birthday) return null
  const bday = typeof birthday === 'string' ? new Date(birthday) : birthday
  const today = new Date()
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  const nextYear = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate())
  const nextBday = thisYear < today ? nextYear : thisYear
  const diffTime = nextBday.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function isBirthdayThisMonth(birthday: Date | string | null | undefined): boolean {
  if (!birthday) return false
  const bday = typeof birthday === 'string' ? new Date(birthday) : birthday
  const today = new Date()
  return bday.getMonth() === today.getMonth()
}

/**
 * If the client's annual birthday falls in the same calendar month as `refDate`,
 * returns that occurrence's date (noon local) when it is on `refDate` or later in the month.
 * Past days in the current month return null. Other months return null.
 * Feb 29 uses the last day of February in non-leap years.
 */
export function getBirthdayOccurrenceInCurrentMonthFromToday(
  birthday: Date | string | null | undefined,
  refDate: Date = new Date()
): Date | null {
  if (!birthday) return null

  let bday: Date
  if (typeof birthday === 'string') {
    if (birthday.includes('T')) {
      const datePart = birthday.split('T')[0]
      bday = new Date(datePart + 'T00:00:00')
    } else {
      bday = new Date(birthday)
    }
  } else if (birthday instanceof Date) {
    bday = birthday
  } else {
    bday = new Date(birthday)
  }

  if (isNaN(bday.getTime())) return null

  const refY = refDate.getFullYear()
  const refM = refDate.getMonth()
  const refD = refDate.getDate()
  if (bday.getMonth() !== refM) return null

  const lastDay = new Date(refY, refM + 1, 0).getDate()
  const occDay = Math.min(bday.getDate(), lastDay)
  if (occDay < refD) return null

  return new Date(refY, refM, occDay, 12, 0, 0, 0)
}

export function isBirthdayToday(birthday: Date | string | null | undefined): boolean {
  if (!birthday) return false

  // Handle both string and Date objects
  let bday: Date
  if (typeof birthday === 'string') {
    // Parse string date - handle both ISO format and date-only format
    // If it's an ISO string with time, extract just the date part to avoid timezone issues
    if (birthday.includes('T')) {
      // Extract date part (YYYY-MM-DD) before parsing
      const datePart = birthday.split('T')[0]
      bday = new Date(datePart + 'T00:00:00')
    } else {
      bday = new Date(birthday)
    }
  } else if (birthday instanceof Date) {
    bday = birthday
  } else {
    bday = new Date(birthday)
  }

  // Validate the date
  if (isNaN(bday.getTime())) return false

  const today = new Date()

  // Normalize both dates to local time and compare month and day (ignore year and time)
  // Create date objects with just the date part (no time) to avoid timezone issues
  const bdayLocal = new Date(bday.getFullYear(), bday.getMonth(), bday.getDate())
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Compare month and day
  return bdayLocal.getMonth() === todayLocal.getMonth() && bdayLocal.getDate() === todayLocal.getDate()
}

export function isBirthdayOnDate(birthday: Date | string | null | undefined, appointmentDate: Date | string): boolean {
  if (!birthday) return false

  // Handle both string and Date objects for birthday
  let bday: Date
  if (typeof birthday === 'string') {
    if (birthday.includes('T')) {
      const datePart = birthday.split('T')[0]
      bday = new Date(datePart + 'T00:00:00')
    } else {
      bday = new Date(birthday)
    }
  } else if (birthday instanceof Date) {
    bday = birthday
  } else {
    bday = new Date(birthday)
  }

  // Validate the date
  if (isNaN(bday.getTime())) return false

  // Handle appointment date
  const aptDate = typeof appointmentDate === 'string' ? new Date(appointmentDate) : appointmentDate
  if (isNaN(aptDate.getTime())) return false

  // Normalize both dates to local time and compare month and day (ignore year and time)
  const bdayLocal = new Date(bday.getFullYear(), bday.getMonth(), bday.getDate())
  const aptDateLocal = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate())

  // Compare month and day
  return bdayLocal.getMonth() === aptDateLocal.getMonth() && bdayLocal.getDate() === aptDateLocal.getDate()
}

export function isBirthdayThisWeek(birthday: Date | string | null | undefined): boolean {
  if (!birthday) return false
  const daysUntil = getDaysUntilBirthday(birthday)
  return daysUntil !== null && daysUntil <= 7 && daysUntil >= 0
}
