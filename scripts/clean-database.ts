import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning database - removing all data...')
  
  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete payments (depends on appointments)
    console.log('Deleting payments...')
    const paymentsDeleted = await prisma.payment.deleteMany({})
    console.log(`✅ Deleted ${paymentsDeleted.count} payments`)
    
    // 2. Delete appointment services (depends on appointments and services)
    console.log('Deleting appointment services...')
    const appointmentServicesDeleted = await prisma.appointmentService.deleteMany({})
    console.log(`✅ Deleted ${appointmentServicesDeleted.count} appointment services`)
    
    // 3. Delete appointments (depends on clients and staff)
    console.log('Deleting appointments...')
    const appointmentsDeleted = await prisma.appointment.deleteMany({})
    console.log(`✅ Deleted ${appointmentsDeleted.count} appointments`)
    
    // 4. Delete loyalty transactions (depends on clients)
    console.log('Deleting loyalty transactions...')
    const loyaltyTransactionsDeleted = await prisma.loyaltyTransaction.deleteMany({})
    console.log(`✅ Deleted ${loyaltyTransactionsDeleted.count} loyalty transactions`)
    
    // 5. Delete loyalty accounts (depends on clients)
    console.log('Deleting loyalty accounts...')
    const loyaltyAccountsDeleted = await prisma.loyaltyAccount.deleteMany({})
    console.log(`✅ Deleted ${loyaltyAccountsDeleted.count} loyalty accounts`)
    
    // 6. Delete strike events (depends on clients)
    console.log('Deleting strike events...')
    const strikeEventsDeleted = await prisma.strikeEvent.deleteMany({})
    console.log(`✅ Deleted ${strikeEventsDeleted.count} strike events`)
    
    // 7. Delete clients
    console.log('Deleting clients...')
    const clientsDeleted = await prisma.client.deleteMany({})
    console.log(`✅ Deleted ${clientsDeleted.count} clients`)
    
    // 8. Delete inventory items
    console.log('Deleting inventory items...')
    const inventoryItemsDeleted = await prisma.inventoryItem.deleteMany({})
    console.log(`✅ Deleted ${inventoryItemsDeleted.count} inventory items`)
    
    // 9. Delete inventory categories
    console.log('Deleting inventory categories...')
    const inventoryCategoriesDeleted = await prisma.inventoryCategory.deleteMany({})
    console.log(`✅ Deleted ${inventoryCategoriesDeleted.count} inventory categories`)
    
    // 10. Delete services
    console.log('Deleting services...')
    const servicesDeleted = await prisma.service.deleteMany({})
    console.log(`✅ Deleted ${servicesDeleted.count} services`)
    
    // 11. Delete service categories
    console.log('Deleting service categories...')
    const serviceCategoriesDeleted = await prisma.serviceCategory.deleteMany({})
    console.log(`✅ Deleted ${serviceCategoriesDeleted.count} service categories`)
    
    // 12. Delete notifications (if model exists)
    console.log('Deleting notifications...')
    try {
      // @ts-ignore - Notification model may not exist in schema
      const notificationsDeleted = await (prisma as any).notification?.deleteMany({})
      if (notificationsDeleted) {
        console.log(`✅ Deleted ${notificationsDeleted.count} notifications`)
      } else {
        console.log('⚠️  Notifications model not found, skipping...')
      }
    } catch (error: any) {
      if (error.message?.includes('not defined') || error.message?.includes('undefined') || error.message?.includes('notification')) {
        console.log('⚠️  Notifications model not found, skipping...')
      } else {
        throw error
      }
    }
    
    // 13. Delete password reset tokens
    console.log('Deleting password reset tokens...')
    const passwordResetTokensDeleted = await prisma.passwordResetToken.deleteMany({})
    console.log(`✅ Deleted ${passwordResetTokensDeleted.count} password reset tokens`)
    
    // 14. Delete sessions
    console.log('Deleting sessions...')
    const sessionsDeleted = await prisma.session.deleteMany({})
    console.log(`✅ Deleted ${sessionsDeleted.count} sessions`)
    
    // 15. Delete accounts (OAuth accounts)
    console.log('Deleting accounts...')
    const accountsDeleted = await prisma.account.deleteMany({})
    console.log(`✅ Deleted ${accountsDeleted.count} accounts`)
    
    // Note: We keep Users and Settings as they are needed for the system to function
    // You can manually delete non-admin users if needed
    
    console.log('\n✨ Database cleaned successfully!')
    console.log('📝 Note: Users and Settings were preserved.')
    console.log('   - Users are needed for authentication')
    console.log('   - Settings are needed for system configuration')
    console.log('\n💡 To remove specific users, do it manually from the database or UI.')
    
  } catch (error: any) {
    console.error('❌ Error cleaning database:', error.message)
    throw error
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
