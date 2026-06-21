import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking inventory items by business...\n')

  try {
    // Get all businesses
    const businesses = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        businessName: true,
      },
    })

    console.log('Businesses:')
    businesses.forEach(b => {
      console.log(`  ${b.id}: ${b.businessName || b.email}`)
    })
    console.log()

    // Get all inventory items
    const allItems = await prisma.inventoryItem.findMany({
      select: {
        id: true,
        name: true,
        staffId: true,
        isArchived: true,
      },
    })

    console.log(`Total inventory items: ${allItems.length}\n`)

    // Group by business
    const itemsByBusiness = new Map<string, any[]>()
    const itemsWithNullStaffId: any[] = []

    allItems.forEach(item => {
      if (item.staffId) {
        if (!itemsByBusiness.has(item.staffId)) {
          itemsByBusiness.set(item.staffId, [])
        }
        itemsByBusiness.get(item.staffId)!.push(item)
      } else {
        itemsWithNullStaffId.push(item)
      }
    })

    // Show items by business
    for (const [staffId, items] of itemsByBusiness.entries()) {
      const business = businesses.find(b => b.id === staffId)
      const businessName = business?.businessName || business?.email || staffId
      const activeItems = items.filter(i => !i.isArchived)
      const archivedItems = items.filter(i => i.isArchived)
      
      console.log(`${businessName} (${staffId}):`)
      console.log(`  Total items: ${items.length}`)
      console.log(`  Active: ${activeItems.length}`)
      console.log(`  Archived: ${archivedItems.length}`)
      
      if (activeItems.length > 0 && activeItems.length <= 10) {
        console.log(`  Active items:`)
        activeItems.forEach(item => console.log(`    - ${item.name}`))
      } else if (activeItems.length > 10) {
        console.log(`  Active items (showing first 10):`)
        activeItems.slice(0, 10).forEach(item => console.log(`    - ${item.name}`))
        console.log(`    ... and ${activeItems.length - 10} more`)
      }
      console.log()
    }

    // Show items with null staffId
    if (itemsWithNullStaffId.length > 0) {
      console.log(`Items with null staffId: ${itemsWithNullStaffId.length}`)
      itemsWithNullStaffId.slice(0, 10).forEach(item => {
        console.log(`  - ${item.name} (archived: ${item.isArchived})`)
      })
      if (itemsWithNullStaffId.length > 10) {
        console.log(`  ... and ${itemsWithNullStaffId.length - 10} more`)
      }
      console.log()
    }

    // Specifically check SaSo business
    const sasoBusiness = businesses.find(b => 
      b.businessName?.toLowerCase().includes('saso') || 
      b.email?.toLowerCase().includes('saso')
    )

    if (sasoBusiness) {
      const sasoItems = itemsByBusiness.get(sasoBusiness.id) || []
      console.log(`\n📦 SaSo Business Inventory:`)
      console.log(`  Total items: ${sasoItems.length}`)
      console.log(`  Active: ${sasoItems.filter(i => !i.isArchived).length}`)
      console.log(`  Archived: ${sasoItems.filter(i => i.isArchived).length}`)
      
      if (sasoItems.length > 0) {
        console.log(`  Items:`)
        sasoItems.forEach(item => {
          console.log(`    - ${item.name} (archived: ${item.isArchived})`)
        })
      } else {
        console.log(`  ⚠️  No items found for SaSo business!`)
      }
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
