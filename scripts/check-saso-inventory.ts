import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking SaSo inventory items...\n')

  try {
    // Get SaSo business
    const sasoBusiness = await prisma.user.findFirst({
      where: {
        OR: [
          { businessName: { contains: 'SaSo', mode: 'insensitive' } },
          { businessName: { contains: 'saso', mode: 'insensitive' } },
          { email: { contains: 'saso', mode: 'insensitive' } },
        ],
      },
      select: { id: true, businessName: true, email: true },
    })

    if (!sasoBusiness) {
      console.log('❌ SaSo business not found')
      return
    }

    console.log(`SaSo Business: ${sasoBusiness.businessName || sasoBusiness.email} (${sasoBusiness.id})\n`)

    // Get all inventory items (including null staffId)
    const allItems = await prisma.inventoryItem.findMany({
      select: {
        id: true,
        name: true,
        staffId: true,
        isArchived: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`Total inventory items in database: ${allItems.length}\n`)

    // Items belonging to SaSo
    const sasoItems = allItems.filter(item => item.staffId === sasoBusiness.id)
    console.log(`Items belonging to SaSo: ${sasoItems.length}`)
    sasoItems.forEach(item => {
      console.log(`  - ${item.name} (archived: ${item.isArchived}, created: ${item.createdAt})`)
    })

    // Items with null staffId (might be orphaned)
    const nullStaffIdItems = allItems.filter(item => !item.staffId)
    console.log(`\nItems with null staffId: ${nullStaffIdItems.length}`)
    nullStaffIdItems.forEach(item => {
      console.log(`  - ${item.name} (archived: ${item.isArchived}, created: ${item.createdAt})`)
    })

    // Check if there are any items that might have been deleted
    // (We can't check deleted items, but we can check if there are any patterns)

    console.log(`\n✅ Summary:`)
    console.log(`   SaSo has ${sasoItems.length} inventory items`)
    console.log(`   There are ${nullStaffIdItems.length} items with null staffId`)
    
    if (nullStaffIdItems.length > 0) {
      console.log(`\n⚠️  Found items with null staffId that might belong to SaSo:`)
      console.log(`   Would you like me to assign them to SaSo?`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
