import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Migrating business hours...')

  try {
    // First, check if the old columns exist and add the new column if needed
    const checkColumn = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      AND column_name IN ('business_hours_start', 'business_hours', 'business_hours_end')
    `

    const hasOldColumns = checkColumn.some(col => col.column_name === 'business_hours_start')
    const hasNewColumn = checkColumn.some(col => col.column_name === 'business_hours')

    if (!hasNewColumn) {
      console.log('Adding business_hours column...')
      await prisma.$executeRaw`
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_hours JSONB
      `
    }

    // Get current settings using raw query to access old columns
    const settingsResult = await prisma.$queryRaw<Array<{
      business_hours_start?: string
      business_hours_end?: string
      business_days?: string[]
      business_hours?: any
    }>>`
      SELECT 
        business_hours_start,
        business_hours_end,
        business_days,
        business_hours
      FROM settings 
      WHERE id = 'singleton'
    `

    if (settingsResult.length === 0) {
      console.log('No settings found, creating default...')
      const defaultBusinessHours = JSON.stringify({
        MONDAY: { start: '09:00', end: '18:00' },
        TUESDAY: { start: '09:00', end: '18:00' },
        WEDNESDAY: { start: '09:00', end: '18:00' },
        THURSDAY: { start: '09:00', end: '18:00' },
        FRIDAY: { start: '09:00', end: '18:00' },
        SATURDAY: { start: '09:00', end: '18:00' },
        SUNDAY: { start: '09:00', end: '18:00' },
      })
      
      await prisma.$executeRaw`
        INSERT INTO settings (
          id, business_hours, business_days, currency, currency_symbol, 
          timezone, date_format, loyalty_earn_mode, loyalty_points_per_dollar,
          strike_late_cancel, strike_no_show, strike_expiration_days, 
          strike_threshold, strike_threshold_action
        ) VALUES (
          'singleton', ${defaultBusinessHours}::jsonb, 
          ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']::text[],
          'USD', '$', 'America/New_York', 'MM/DD/YYYY', 'PER_DOLLAR', 1.0, 1, 2, 90, 3, 'REQUIRES_DEPOSIT'
        )
      `
      console.log('Default settings created')
      return
    }

    const settings = settingsResult[0]

    // Check if businessHours already exists and has data
    if (settings.business_hours && typeof settings.business_hours === 'object') {
      console.log('Business hours already migrated')
      return
    }

    // Migrate from old format
    const oldStart = settings.business_hours_start || '09:00'
    const oldEnd = settings.business_hours_end || '18:00'
    
    // Create new business hours object
    const businessHours = {
      MONDAY: { start: oldStart, end: oldEnd },
      TUESDAY: { start: oldStart, end: oldEnd },
      WEDNESDAY: { start: oldStart, end: oldEnd },
      THURSDAY: { start: oldStart, end: oldEnd },
      FRIDAY: { start: oldStart, end: oldEnd },
      SATURDAY: { start: oldStart, end: oldEnd },
      SUNDAY: { start: oldStart, end: oldEnd },
    }

    // Update settings with new business hours using raw SQL
    await prisma.$executeRaw`
      UPDATE settings 
      SET business_hours = ${JSON.stringify(businessHours)}::jsonb
      WHERE id = 'singleton'
    `

    console.log('Business hours migrated successfully')
    console.log(`Migrated from ${oldStart}-${oldEnd} to per-day hours`)

    // Now drop the old columns
    if (hasOldColumns) {
      console.log('Dropping old columns...')
      await prisma.$executeRaw`
        ALTER TABLE settings DROP COLUMN IF EXISTS business_hours_start
      `
      await prisma.$executeRaw`
        ALTER TABLE settings DROP COLUMN IF EXISTS business_hours_end
      `
      console.log('Old columns dropped')
    }
  } catch (error: any) {
    console.error('Error during migration:', error.message)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('Error migrating business hours:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
