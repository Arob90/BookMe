import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding business_name field to users table...')
  
  try {
    // This will be handled by Prisma migrate, but we can verify the field exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS business_name VARCHAR(255) NULL;
    `)
    console.log('✅ business_name field added successfully!')
  } catch (error: any) {
    if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
      console.log('✅ business_name field already exists')
    } else {
      console.error('❌ Error adding business_name field:', error.message)
      throw error
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
