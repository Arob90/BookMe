'use server'

import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'
import { formatUtcDateToYmd, parseHolidayDateInput } from '@/lib/date-only'

export type HolidayType = 'PUBLIC' | 'BANK' | 'CUSTOM'

/** Row shape from raw SELECT (aliases match Prisma field names for the UI). */
type HolidaySelectRow = {
  id: string
  date: Date
  name: string
  type: string
  repeatYearly: boolean
  isOpen: boolean
  openAt: string | null
  closeAt: string | null
}

type HolidayDbRow = {
  id: string
  date: Date
  name: string
  type: string
  repeat_yearly: boolean
  is_open: boolean | null
  open_at: string | null
  close_at: string | null
}

export async function getHolidays() {
  const session = await getServerSession(authOptions)
  if (!session) return []

  try {
    const rows = await db.$queryRaw<HolidaySelectRow[]>`
      SELECT
        id,
        date,
        name,
        type,
        repeat_yearly AS "repeatYearly",
        COALESCE(is_open, false) AS "isOpen",
        open_at AS "openAt",
        close_at AS "closeAt"
      FROM holidays
      WHERE staff_id = ${getSessionStaffId(session)}
      ORDER BY date ASC
    `
    return rows.map((r) => ({
      id: r.id,
      date: new Date(r.date),
      name: r.name,
      type: r.type,
      repeatYearly: r.repeatYearly,
      isOpen: r.isOpen,
      openAt: r.openAt,
      closeAt: r.closeAt,
    }))
  } catch {
    return []
  }
}

function normalizeHm(t: string | undefined | null): string | null {
  if (t == null || !String(t).trim()) return null
  const s = String(t).trim().slice(0, 5)
  if (!/^\d{1,2}:\d{2}$/.test(s)) return null
  const [h, m] = s.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseHolidayHours(isOpen: boolean, openAt?: string | null, closeAt?: string | null) {
  if (!isOpen) {
    return { isOpen: false, openAt: null as string | null, closeAt: null as string | null }
  }
  const open = normalizeHm(openAt)
  const close = normalizeHm(closeAt)
  if (!open || !close) throw new Error('Opening and closing times are required when open on this day')
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  const oMin = oh * 60 + om
  const cMin = ch * 60 + cm
  if (cMin <= oMin) throw new Error('Closing time must be after opening time')
  return { isOpen: true, openAt: open, closeAt: close }
}

export async function createHoliday(data: {
  date: Date | string
  name: string
  type: HolidayType
  repeatYearly?: boolean
  isOpen?: boolean
  openAt?: string | null
  closeAt?: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const date = parseHolidayDateInput(data.date)
  const hours = parseHolidayHours(data.isOpen ?? false, data.openAt, data.closeAt)
  const ymd = formatUtcDateToYmd(date)
  const id = randomUUID()

  await db.$executeRaw`
    INSERT INTO holidays (id, staff_id, date, name, type, repeat_yearly, is_open, open_at, close_at, created_at)
    VALUES (
      ${id},
      ${getSessionStaffId(session)},
      ${ymd}::date,
      ${data.name.trim()},
      ${data.type},
      ${data.repeatYearly ?? false},
      ${hours.isOpen},
      ${hours.openAt},
      ${hours.closeAt},
      NOW()
    )
  `
  revalidatePath('/app/settings')
}

export async function updateHoliday(
  id: string,
  data: {
    date?: Date | string
    name?: string
    type?: HolidayType
    repeatYearly?: boolean
    isOpen?: boolean
    openAt?: string | null
    closeAt?: string | null
  }
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const existing = await db.$queryRaw<HolidayDbRow[]>`
    SELECT id, date, name, type, repeat_yearly, is_open, open_at, close_at
    FROM holidays
    WHERE id = ${id} AND staff_id = ${getSessionStaffId(session)}
    LIMIT 1
  `
  if (!existing.length) throw new Error('Holiday not found')
  const cur = existing[0]

  const name = data.name !== undefined ? data.name.trim() : cur.name
  const type = data.type !== undefined ? data.type : cur.type
  const repeatYearly = data.repeatYearly !== undefined ? data.repeatYearly : cur.repeat_yearly
  const dateYmd =
    data.date !== undefined
      ? formatUtcDateToYmd(parseHolidayDateInput(data.date))
      : formatUtcDateToYmd(parseHolidayDateInput(cur.date))

  let isOpen = cur.is_open ?? false
  let openAt = cur.open_at
  let closeAt = cur.close_at
  if (data.isOpen !== undefined) {
    const h = parseHolidayHours(data.isOpen, data.openAt, data.closeAt)
    isOpen = h.isOpen
    openAt = h.openAt
    closeAt = h.closeAt
  }

  await db.$executeRaw`
    UPDATE holidays
    SET
      name = ${name},
      type = ${type},
      repeat_yearly = ${repeatYearly},
      date = ${dateYmd}::date,
      is_open = ${isOpen},
      open_at = ${openAt},
      close_at = ${closeAt}
    WHERE id = ${id} AND staff_id = ${getSessionStaffId(session)}
  `
  revalidatePath('/app/settings')
}

export async function deleteHoliday(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  await db.$executeRaw`
    DELETE FROM holidays WHERE id = ${id} AND staff_id = ${getSessionStaffId(session)}
  `
  revalidatePath('/app/settings')
}
