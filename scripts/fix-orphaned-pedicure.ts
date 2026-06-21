import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing orphaned Pedicure category...\n')

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
    console.log(`Current owner: ${pedicureCategory.staffId || 'null'}`)
    console.log(`Services using it: ${pedicureCategory.services.length}`)

    // Check if there are any services with valid staffId
    const servicesWithStaffId = pedicureCategory.services.filter(s => s.staffId !== null)
    const servicesWithNullStaffId = pedicureCategory.services.filter(s => s.staffId === null)

    console.log(`\nServices with staffId: ${servicesWithStaffId.length}`)
    console.log(`Services with null staffId: ${servicesWithNullStaffId.length}`)

    if (servicesWithNullStaffId.length > 0) {
      console.log('\n⚠️  Found services with null staffId:')
      servicesWithNullStaffId.forEach(s => {
        console.log(`  - ${s.name} (id: ${s.id})`)
      })

      // Since these services have null staffId, they're orphaned
      // The category is currently owned by "Faded" but "Faded" doesn't use it
      // Best solution: Delete the orphaned services and the category
      // OR: Check if "SaSo" business should own it

      // Get "SaSo" business ID
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

      if (sasoBusiness) {
        console.log(`\n🔧 Found SaSo business: ${sasoBusiness.businessName || sasoBusiness.email} (${sasoBusiness.id})`)
        console.log(`   Reassigning category to SaSo...`)

        // Reassign category to SaSo
        await prisma.serviceCategory.update({
          where: { id: pedicureCategory.id },
          data: { staffId: sasoBusiness.id },
        })

        // Update orphaned services to belong to SaSo
        for (const service of servicesWithNullStaffId) {
          console.log(`   Updating service "${service.name}" to belong to SaSo...`)
          await prisma.service.update({
            where: { id: service.id },
            data: { staffId: sasoBusiness.id },
          })
        }

        console.log('✅ Category and services reassigned to SaSo!')
      } else {
        console.log('\n⚠️  SaSo business not found')
        console.log('🗑️  Deleting orphaned category and services...')

        // Delete orphaned services
        for (const service of servicesWithNullStaffId) {
          await prisma.service.delete({
            where: { id: service.id },
          })
          console.log(`   Deleted service: ${service.name}`)
        }

        // Delete the category
        await prisma.serviceCategory.delete({
          where: { id: pedicureCategory.id },
        })
        console.log('✅ Deleted orphaned category')
      }
    } else if (servicesWithStaffId.length > 0) {
      // Services have valid staffId - reassign category to the business that uses it
      const staffIds = new Set(servicesWithStaffId.map(s => s.staffId).filter((id): id is string => id !== null))
      const primaryOwner = Array.from(staffIds)[0]

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
      console.log('✅ Category reassigned!')
    } else {
      // No services use it - delete it
      console.log('\n🗑️  No services use this category - deleting...')
      await prisma.serviceCategory.delete({
        where: { id: pedicureCategory.id },
      })
      console.log('✅ Category deleted')
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
