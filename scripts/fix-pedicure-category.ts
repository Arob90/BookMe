import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing Pedicure category...\n')

  try {
    // Find the Pedicure category
    const pedicureCategory = await prisma.serviceCategory.findFirst({
      where: {
        name: 'Pedicure',
      },
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

    if (!pedicureCategory) {
      console.log('❌ Pedicure category not found')
      return
    }

    console.log(`Found category: "${pedicureCategory.name}"`)
    console.log(`Current owner (staffId): ${pedicureCategory.staffId || 'null'}`)
    console.log(`Services using it: ${pedicureCategory.services.length}`)

    // Find which business actually uses this category
    const servicesByBusiness = new Map<string, any[]>()
    pedicureCategory.services.forEach(service => {
      if (service.staffId) {
        if (!servicesByBusiness.has(service.staffId)) {
          servicesByBusiness.set(service.staffId, [])
        }
        servicesByBusiness.get(service.staffId)!.push(service)
      }
    })

    if (servicesByBusiness.size === 0) {
      console.log('⚠️  No services with staffId found. Checking all services...')
      pedicureCategory.services.forEach(s => {
        console.log(`  Service: ${s.name}, staffId: ${s.staffId || 'null'}`)
      })
      
      // If no services use it, delete it
      if (pedicureCategory.services.length === 0) {
        console.log('🗑️  Deleting unused category...')
        await prisma.serviceCategory.delete({
          where: { id: pedicureCategory.id },
        })
        console.log('✅ Deleted unused category')
        return
      }
    }

    console.log('\nServices by business:')
    for (const [staffId, services] of servicesByBusiness.entries()) {
      const business = await prisma.user.findUnique({
        where: { id: staffId },
        select: { businessName: true, email: true },
      })
      const businessName = business?.businessName || business?.email || staffId
      console.log(`  ${businessName} (${staffId}): ${services.length} service(s)`)
      services.forEach(s => console.log(`    - ${s.name}`))
    }

    // Get the business with the most services
    if (servicesByBusiness.size > 0) {
      const primaryOwner = Array.from(servicesByBusiness.entries())
        .sort((a, b) => b[1].length - a[1].length)[0][0]

      const business = await prisma.user.findUnique({
        where: { id: primaryOwner },
        select: { businessName: true, email: true },
      })
      const businessName = business?.businessName || business?.email || primaryOwner

      console.log(`\n🔧 Reassigning category to: ${businessName} (${primaryOwner})`)

      await prisma.serviceCategory.update({
        where: { id: pedicureCategory.id },
        data: { staffId: primaryOwner },
      })

      console.log('✅ Category reassigned successfully!')
    } else {
      console.log('⚠️  Could not determine owner - services may have null staffId')
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
