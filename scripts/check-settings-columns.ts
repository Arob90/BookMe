import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking Settings table columns...');

  try {
    // Try to query the settings table with all fields
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'settings'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current columns in settings table:');
    console.log(JSON.stringify(result, null, 2));
    
    // Try to query settings
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
      console.log('\n✅ Settings query successful!');
      console.log('Settings:', JSON.stringify(settings, null, 2));
    } catch (error: any) {
      console.log('\n❌ Settings query failed:');
      console.log(error.message);
    }
  } catch (error: any) {
    console.error('Error checking columns:', error);
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
