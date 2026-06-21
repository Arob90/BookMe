import { db } from '@/lib/db'
import type { PublicHolidayLite } from '@/lib/booking-effective-hours'

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

/** Public (no auth): holidays for a business/staff id — same rows as admin settings. */
export async function getPublicHolidaysForStaff(staffId: string): Promise<PublicHolidayLite[]> {
  const rows = await db.$queryRaw<HolidayDbRow[]>`
    SELECT id, date, name, type, repeat_yearly, is_open, open_at, close_at
    FROM holidays
    WHERE staff_id = ${staffId}
    ORDER BY date ASC
  `
  return rows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString() : new Date(r.date as unknown as string).toISOString(),
    name: r.name,
    repeatYearly: r.repeat_yearly,
    isOpen: r.is_open ?? false,
    openAt: r.open_at,
    closeAt: r.close_at,
  }))
}
