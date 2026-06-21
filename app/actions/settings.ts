'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { requireAdmin } from '@/lib/authz'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const businessHoursSchema = z.record(
  z.string(),
  z.object({
    start: z.string(),
    end: z.string(),
  })
)

const updateSettingsSchema = z.object({
  businessHours: businessHoursSchema.optional(),
  businessDays: z.array(z.string()).optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  // Loyalty settings (managed in Loyalty & Strike page)
  loyaltyEarnMode: z.enum(['PER_DOLLAR', 'PER_VISIT']).optional(),
  loyaltyPointsPerDollar: z.number().optional(),
  loyaltyPointsPerVisit: z.number().int().optional(),
  // Strike settings (managed in Loyalty & Strike page)
  strikeLateCancel: z.number().int().optional(),
  strikeNoShow: z.number().int().optional(),
  strikeExpirationDays: z.number().int().optional(),
  strikeThreshold: z.number().int().optional(),
  strikeThresholdAction: z.enum(['REQUIRES_DEPOSIT', 'REQUIRES_APPROVAL']).optional(),
  notificationSettings: z
    .object({
      emailReminders: z.boolean().optional(),
      smsReminders: z.boolean().optional(),
      appointmentConfirmations: z.boolean().optional(),
      appointmentReminders: z.boolean().optional(),
    })
    .optional(),
})

export async function getSettings() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Get settings for this specific business
  let settings
  try {
    settings = await db.settings.findUnique({ where: { staffId: getSessionStaffId(session) } })
  } catch (error: any) {
    // If staffId field doesn't exist yet (Prisma client not regenerated), fall back to singleton
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      console.warn('Settings staffId field not available yet. Using singleton. Please run: npx prisma db push && npx prisma generate')
      settings = await db.settings.findUnique({ where: { id: 'singleton' } })
    } else {
      throw error
    }
  }

  if (!settings) {
    const defaultBusinessHours = {
      MONDAY: { start: '09:00', end: '18:00' },
      TUESDAY: { start: '09:00', end: '18:00' },
      WEDNESDAY: { start: '09:00', end: '18:00' },
      THURSDAY: { start: '09:00', end: '18:00' },
      FRIDAY: { start: '09:00', end: '18:00' },
      SATURDAY: { start: '09:00', end: '18:00' },
      SUNDAY: { start: '09:00', end: '18:00' },
    }

    // Create default settings for this business
    try {
      settings = await db.settings.create({
        data: {
          staffId: getSessionStaffId(session),
          businessHours: defaultBusinessHours,
          businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          currency: 'USD',
          currencySymbol: '$',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          loyaltyEarnMode: 'PER_DOLLAR',
          loyaltyPointsPerDollar: 1.0,
          strikeLateCancel: 1,
          strikeNoShow: 2,
          strikeExpirationDays: 90,
          strikeThreshold: 3,
          strikeThresholdAction: 'REQUIRES_DEPOSIT',
        },
      })
    } catch (error: any) {
      // If staffId field doesn't exist yet, create singleton instead
      if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
        settings = await db.settings.create({
          data: {
            id: 'singleton',
            businessHours: defaultBusinessHours,
            businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
            currency: 'USD',
            currencySymbol: '$',
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            loyaltyEarnMode: 'PER_DOLLAR',
            loyaltyPointsPerDollar: 1.0,
            strikeLateCancel: 1,
            strikeNoShow: 2,
            strikeExpirationDays: 90,
            strikeThreshold: 3,
            strikeThresholdAction: 'REQUIRES_DEPOSIT',
          },
        })
      } else {
        throw error
      }
    }
  }

  // Ensure businessHours exists and has all days
  if (!settings.businessHours || typeof settings.businessHours !== 'object') {
    const defaultBusinessHours = {
      MONDAY: { start: '09:00', end: '18:00' },
      TUESDAY: { start: '09:00', end: '18:00' },
      WEDNESDAY: { start: '09:00', end: '18:00' },
      THURSDAY: { start: '09:00', end: '18:00' },
      FRIDAY: { start: '09:00', end: '18:00' },
      SATURDAY: { start: '09:00', end: '18:00' },
      SUNDAY: { start: '09:00', end: '18:00' },
    }
    try {
      settings = await db.settings.update({
        where: { staffId: getSessionStaffId(session) },
        data: { businessHours: defaultBusinessHours },
      })
    } catch (error: any) {
      // If staffId field doesn't exist yet, use singleton
      if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
        settings = await db.settings.update({
          where: { id: 'singleton' },
          data: { businessHours: defaultBusinessHours },
        })
      } else {
        throw error
      }
    }
  }

  return settings
}

export async function updateSettings(data: Partial<z.infer<typeof updateSettingsSchema>>) {
  const session = await requireAdmin()

  const defaultBusinessHours = {
    MONDAY: { start: '09:00', end: '18:00' },
    TUESDAY: { start: '09:00', end: '18:00' },
    WEDNESDAY: { start: '09:00', end: '18:00' },
    THURSDAY: { start: '09:00', end: '18:00' },
    FRIDAY: { start: '09:00', end: '18:00' },
    SATURDAY: { start: '09:00', end: '18:00' },
    SUNDAY: { start: '09:00', end: '18:00' },
  }

  let settings
  try {
    settings = await db.settings.upsert({
      where: { staffId: getSessionStaffId(session) },
      update: data,
      create: {
        staffId: getSessionStaffId(session),
        businessHours: data.businessHours || defaultBusinessHours,
        businessDays: data.businessDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
        currency: data.currency || 'USD',
        currencySymbol: data.currencySymbol || '$',
        timezone: data.timezone || 'America/New_York',
        dateFormat: data.dateFormat || 'MM/DD/YYYY',
        loyaltyEarnMode: data.loyaltyEarnMode || 'PER_DOLLAR',
        loyaltyPointsPerDollar: data.loyaltyPointsPerDollar || 1.0,
        loyaltyPointsPerVisit: data.loyaltyPointsPerVisit || null,
        strikeLateCancel: data.strikeLateCancel || 1,
        strikeNoShow: data.strikeNoShow || 2,
        strikeExpirationDays: data.strikeExpirationDays || 90,
        strikeThreshold: data.strikeThreshold || 3,
        strikeThresholdAction: data.strikeThresholdAction || 'REQUIRES_DEPOSIT',
      },
    })
  } catch (error: any) {
    // If staffId field doesn't exist yet, use singleton
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      settings = await db.settings.upsert({
        where: { id: 'singleton' },
        update: data,
        create: {
          id: 'singleton',
          businessHours: data.businessHours || defaultBusinessHours,
          businessDays: data.businessDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          currency: data.currency || 'USD',
          currencySymbol: data.currencySymbol || '$',
          timezone: data.timezone || 'America/New_York',
          dateFormat: data.dateFormat || 'MM/DD/YYYY',
          loyaltyEarnMode: data.loyaltyEarnMode || 'PER_DOLLAR',
          loyaltyPointsPerDollar: data.loyaltyPointsPerDollar || 1.0,
          loyaltyPointsPerVisit: data.loyaltyPointsPerVisit || null,
          strikeLateCancel: data.strikeLateCancel || 1,
          strikeNoShow: data.strikeNoShow || 2,
          strikeExpirationDays: data.strikeExpirationDays || 90,
          strikeThreshold: data.strikeThreshold || 3,
          strikeThresholdAction: data.strikeThresholdAction || 'REQUIRES_DEPOSIT',
        },
      })
    } else {
      throw error
    }
  }

  revalidatePath('/app/settings')
  revalidatePath('/app/policies')
  return settings
}

/** Update only notification settings - avoids upsert complexity. */
export async function updateNotificationSettings(notificationSettings: {
  emailReminders?: boolean
  smsReminders?: boolean
  appointmentConfirmations?: boolean
  appointmentReminders?: boolean
}) {
  const session = await requireAdmin()

  const data = JSON.parse(JSON.stringify(notificationSettings)) as Record<string, boolean>

  const existing = await db.settings.findFirst({
    where: { staffId: getSessionStaffId(session) },
    select: { id: true },
  })

  if (existing) {
    await db.settings.update({
      where: { id: existing.id },
      data: { notificationSettings: data },
    })
  } else {
    const singleton = await db.settings.findUnique({
      where: { id: 'singleton' },
      select: { id: true },
    })
    if (singleton) {
      await db.settings.update({
        where: { id: 'singleton' },
        data: { notificationSettings: data },
      })
    } else {
      const defaultBusinessHours = {
        MONDAY: { start: '09:00', end: '18:00' },
        TUESDAY: { start: '09:00', end: '18:00' },
        WEDNESDAY: { start: '09:00', end: '18:00' },
        THURSDAY: { start: '09:00', end: '18:00' },
        FRIDAY: { start: '09:00', end: '18:00' },
        SATURDAY: { start: '09:00', end: '18:00' },
        SUNDAY: { start: '09:00', end: '18:00' },
      }
      await db.settings.create({
        data: {
          staffId: getSessionStaffId(session),
          businessHours: defaultBusinessHours,
          businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          notificationSettings: data,
        },
      })
    }
  }

  revalidatePath('/app/settings')
}
