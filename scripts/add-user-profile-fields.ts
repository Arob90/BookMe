import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding User profile fields...')
  
  try {
    // Add first_name column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_name TEXT;
    `)
    console.log('✅ Added first_name column')

    // Add last_name column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_name TEXT;
    `)
    console.log('✅ Added last_name column')

    // Add phone column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `)
    console.log('✅ Added phone column')

    // Add birthday column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS birthday TIMESTAMP;
    `)
    console.log('✅ Added birthday column')

    // Add address column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS address TEXT;
    `)
    console.log('✅ Added address column')

    // Add profile_photo column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_photo TEXT;
    `)
    console.log('✅ Added profile_photo column')

    // Add updated_at column if not exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `)
    
    // Update existing rows to have updated_at = created_at if it's null
    await prisma.$executeRawUnsafe(`
      UPDATE users 
      SET updated_at = created_at 
      WHERE updated_at IS NULL;
    `)
    console.log('✅ Added/updated updated_at column')

    console.log('✅ All User profile fields added successfully!')
  } catch (err: any) {
    console.log('Note: Some columns may already exist or error occurred:', err.message)
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
