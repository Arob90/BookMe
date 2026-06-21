import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding Payment table and updating schema...')
  
  // First, add updated_at to users if it doesn't exist
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`)
    await prisma.$executeRawUnsafe(`UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;`)
    console.log('✅ Updated users table')
  } catch (err: any) {
    console.log('Note: updated_at may already exist or error occurred:', err.message)
  }

  // Create payments table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        appointment_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method TEXT,
        notes TEXT,
        paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT payments_appointment_id_fkey 
          FOREIGN KEY (appointment_id) 
          REFERENCES appointments(id) 
          ON DELETE CASCADE,
        CONSTRAINT payments_client_id_fkey 
          FOREIGN KEY (client_id) 
          REFERENCES clients(id) 
          ON DELETE CASCADE
      );
    `)
    
    // Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS payments_appointment_id_idx ON payments(appointment_id);`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS payments_client_id_idx ON payments(client_id);`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON payments(paid_at);`)
    
    console.log('✅ Payment table created successfully!')
  } catch (err: any) {
    console.log('Note: payments table may already exist or error occurred:', err.message)
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
