import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding business_days column to settings table...');

  try {
    // Add business_days column as TEXT[] array
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
          ALTER TABLE "settings" ADD COLUMN "business_days" TEXT[] DEFAULT ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column business_days already exists in settings.';
      END $$;
    `);
    console.log('✅ Added business_days column');

    // Update existing settings to have default business days if null
    await prisma.$executeRawUnsafe(`
      UPDATE "settings" 
      SET "business_days" = ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      WHERE "business_days" IS NULL;
    `);
    console.log('✅ Updated existing settings with default business days');

    console.log('✅ All business_days updates completed successfully!');
  } catch (e) {
    console.error('Error adding business_days column:', e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
