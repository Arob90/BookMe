import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Settings fields (currency, currencySymbol, timezone, dateFormat)...');

  const addColumn = async (columnName: string, columnType: string, defaultValue: string) => {
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            ALTER TABLE "settings" ADD COLUMN "${columnName}" ${columnType} DEFAULT ${defaultValue};
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column ${columnName} already exists in settings.';
        END $$;
      `);
      console.log(`✅ Added ${columnName} column`);
    } catch (e) {
      console.error(`Error adding ${columnName} column:`, e);
    }
  };

  // Add new settings fields
  await addColumn('currency', 'TEXT', "'USD'");
  await addColumn('currency_symbol', 'TEXT', "'$'");
  await addColumn('timezone', 'TEXT', "'America/New_York'");
  await addColumn('date_format', 'TEXT', "'MM/DD/YYYY'");

  console.log('✅ All Settings fields added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
