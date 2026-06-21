import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getPublicHolidaysForStaff } from '@/lib/public-holidays'
import { computeEffectiveSlotWindow, type DayHoursShape } from '@/lib/booking-effective-hours'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    const forDate = searchParams.get('date')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const holidays = await getPublicHolidaysForStaff(businessId).catch(() => [] as Awaited<ReturnType<typeof getPublicHolidaysForStaff>>)

    // Get settings for the specific business
    let settings
    try {
      settings = await db.settings.findUnique({ where: { staffId: businessId } })
    } catch (error: any) {
      if (error.message?.includes('Unknown argument `staffId`')) {
        settings = await db.settings.findUnique({ where: { id: 'singleton' } })
      } else {
        throw error
      }
    }

    const defaultBusinessHours = {
      MONDAY: { start: '09:00', end: '18:00' },
      TUESDAY: { start: '09:00', end: '18:00' },
      WEDNESDAY: { start: '09:00', end: '18:00' },
      THURSDAY: { start: '09:00', end: '18:00' },
      FRIDAY: { start: '09:00', end: '18:00' },
      SATURDAY: { start: '09:00', end: '18:00' },
      SUNDAY: { start: '09:00', end: '18:00' },
    }
    const defaultBusinessDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

    if (!settings) {
      const payload: Record<string, unknown> = {
        businessHours: defaultBusinessHours,
        businessDays: defaultBusinessDays,
        holidays,
      }
      if (forDate && /^\d{4}-\d{2}-\d{2}$/.test(forDate)) {
        payload.effective = computeEffectiveSlotWindow(
          forDate,
          defaultBusinessHours as Record<string, DayHoursShape>,
          defaultBusinessDays,
          holidays
        )
      }
      return NextResponse.json(payload)
    }

    let businessHours = settings.businessHours
    if (!businessHours || typeof businessHours !== 'object') {
      businessHours = defaultBusinessHours
    }

    const businessDays = settings.businessDays || defaultBusinessDays

    const payload: Record<string, unknown> = {
      businessHours,
      businessDays,
      holidays,
    }
    if (forDate && /^\d{4}-\d{2}-\d{2}$/.test(forDate)) {
      payload.effective = computeEffectiveSlotWindow(
        forDate,
        businessHours as Record<string, DayHoursShape>,
        businessDays,
        holidays
      )
    }
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('Error fetching business hours:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business hours' },
      { status: 500 }
    )
  }
}
