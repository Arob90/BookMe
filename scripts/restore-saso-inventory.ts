import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Restoring SaSo inventory items...\n')

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

    // Get all inventory items with null staffId (orphaned items)
    const orphanedItems = await prisma.inventoryItem.findMany({
      where: {
        staffId: null,
      },
      select: {
        id: true,
        name: true,
        isArchived: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`Found ${orphanedItems.length} orphaned inventory items (null staffId)\n`)

    if (orphanedItems.length === 0) {
      console.log('✅ No orphaned items to restore')
      return
    }

    // Assign all orphaned items to SaSo
    let restored = 0
    for (const item of orphanedItems) {
      console.log(`Restoring: ${item.name}...`)
      try {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { staffId: sasoBusiness.id },
        })
        console.log(`  ✅ Restored "${item.name}" to SaSo`)
        restored++
      } catch (error: any) {
        console.log(`  ❌ Failed to restore "${item.name}": ${error.message}`)
      }
    }

    // Also check if there are any items that might have been incorrectly assigned
    // Get all businesses
    const allBusinesses = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, businessName: true, email: true },
    })

    console.log(`\n📦 Checking all inventory items by business:`)
    for (const business of allBusinesses) {
      const items = await prisma.inventoryItem.findMany({
        where: { staffId: business.id },
        select: { id: true, name: true },
      })
      const businessName = business.businessName || business.email
      console.log(`  ${businessName}: ${items.length} items`)
      if (items.length > 0 && items.length <= 5) {
        items.forEach(item => console.log(`    - ${item.name}`))
      }
    }

    // Final count for SaSo
    const sasoItems = await prisma.inventoryItem.findMany({
      where: { staffId: sasoBusiness.id },
      select: { id: true, name: true, isArchived: true },
    })

    console.log(`\n✅ Restoration complete!`)
    console.log(`   Restored ${restored} items to SaSo`)
    console.log(`   SaSo now has ${sasoItems.length} total inventory items`)
    console.log(`   Active: ${sasoItems.filter(i => !i.isArchived).length}`)
    console.log(`   Archived: ${sasoItems.filter(i => i.isArchived).length}`)
    
    if (sasoItems.length > 0) {
      console.log(`\n📦 SaSo inventory items:`)
      sasoItems.forEach(item => {
        console.log(`  - ${item.name} ${item.isArchived ? '(archived)' : ''}`)
      })
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
