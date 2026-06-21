import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking category usage...\n')

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

    // Get all categories
    const categories = await prisma.serviceCategory.findMany({
      include: {
        services: {
          select: {
            id: true,
            name: true,
            staffId: true,
          },
        },
      },
    })

    for (const category of categories) {
      console.log(`Category: "${category.name}"`)
      console.log(`  Owner (staffId): ${category.staffId || 'null'}`)
      console.log(`  Services using it: ${category.services.length}`)
      
      // Group services by business
      const servicesByBusiness = new Map<string, any[]>()
      category.services.forEach(service => {
        if (service.staffId) {
          if (!servicesByBusiness.has(service.staffId)) {
            servicesByBusiness.set(service.staffId, [])
          }
          servicesByBusiness.get(service.staffId)!.push(service)
        }
      })

      if (servicesByBusiness.size > 0) {
        console.log(`  Services by business:`)
        servicesByBusiness.forEach((services, staffId) => {
          const business = businesses.find(b => b.id === staffId)
          const businessName = business?.businessName || business?.email || staffId
          console.log(`    ${businessName}: ${services.length} service(s)`)
          if (services.length <= 5) {
            services.forEach(s => console.log(`      - ${s.name}`))
          }
        })
      }

      // Check if category owner matches the businesses using it
      if (category.staffId) {
        const ownerBusiness = businesses.find(b => b.id === category.staffId)
        const ownerName = ownerBusiness?.businessName || ownerBusiness?.email || category.staffId
        console.log(`  Owner business: ${ownerName}`)
        
        if (servicesByBusiness.has(category.staffId)) {
          console.log(`  ✓ Owner business uses this category`)
        } else {
          console.log(`  ⚠️  Owner business does NOT use this category!`)
        }

        // Check for other businesses using it
        const otherBusinesses = Array.from(servicesByBusiness.keys()).filter(id => id !== category.staffId)
        if (otherBusinesses.length > 0) {
          console.log(`  ⚠️  WARNING: Other businesses are using this category:`)
          otherBusinesses.forEach(staffId => {
            const business = businesses.find(b => b.id === staffId)
            const businessName = business?.businessName || business?.email || staffId
            console.log(`    - ${businessName}: ${servicesByBusiness.get(staffId)!.length} service(s)`)
          })
        }
      }

      console.log()
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
