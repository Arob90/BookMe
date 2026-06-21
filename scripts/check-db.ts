import { db } from '../lib/db'

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...')
    
    // Try to connect
    await db.$connect()
    console.log('✅ Database connected successfully')
    
    // Check if admin user exists
    const adminUser = await db.user.findUnique({
      where: { email: 'admin@bookme.com' },
    })
    
    if (adminUser) {
      console.log('✅ Admin user exists')
      console.log('   Email:', adminUser.email)
      console.log('   Role:', adminUser.role)
    } else {
      console.log('⚠️  Admin user not found. Run: npm run db:seed')
    }
    
    // Count users
    const userCount = await db.user.count()
    console.log(`📊 Total users in database: ${userCount}`)
    
    await db.$disconnect()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Database connection failed:')
    console.error('   Error:', error.message)
    console.error('\n💡 Make sure:')
    console.error('   1. Your DATABASE_URL in .env is correct')
    console.error('   2. Your database server is running')
    console.error('   3. You have run: npm run db:push')
    process.exit(1)
  }
}

checkDatabase()
