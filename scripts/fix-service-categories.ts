import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Starting service category fix...')

  try {
    // Get all service categories
    const allCategories = await prisma.serviceCategory.findMany({
      include: {
        services: {
          select: {
            id: true,
            staffId: true,
          },
        },
      },
    })

    console.log(`📦 Found ${allCategories.length} categories to check`)

    let fixed = 0
    let skipped = 0
    let deleted = 0

    for (const category of allCategories) {
      // Get all unique staffIds that use this category
      const staffIdsUsingCategory = new Set(
        category.services
          .map(s => s.staffId)
          .filter((id): id is string => id !== null)
      )

      if (staffIdsUsingCategory.size === 0) {
        // Category has no services - check if it has staffId
        if (!category.staffId) {
          // Orphaned category with no services and no owner - delete it
          console.log(`🗑️  Deleting orphaned category: "${category.name}" (no services, no owner)`)
          await prisma.serviceCategory.delete({
            where: { id: category.id },
          })
          deleted++
        } else {
          // Category has owner but no services - keep it
          console.log(`✓ Category "${category.name}" already has owner: ${category.staffId}`)
          skipped++
        }
        continue
      }

      if (staffIdsUsingCategory.size === 1) {
        // Only one business uses this category
        const ownerId = Array.from(staffIdsUsingCategory)[0]

        if (category.staffId === ownerId) {
          // Already correct
          console.log(`✓ Category "${category.name}" already correct (owner: ${ownerId})`)
          skipped++
        } else {
          // Update to correct owner
          console.log(`🔧 Fixing category "${category.name}": ${category.staffId || 'null'} → ${ownerId}`)
          await prisma.serviceCategory.update({
            where: { id: category.id },
            data: { staffId: ownerId },
          })
          fixed++
        }
      } else {
        // Multiple businesses use this category - need to duplicate it
        console.log(`⚠️  Category "${category.name}" is used by ${staffIdsUsingCategory.size} businesses`)
        
        // Get the business with the most services using this category
        const serviceCounts = new Map<string, number>()
        category.services.forEach(service => {
          if (service.staffId) {
            serviceCounts.set(service.staffId, (serviceCounts.get(service.staffId) || 0) + 1)
          }
        })

        const primaryOwner = Array.from(serviceCounts.entries())
          .sort((a, b) => b[1] - a[1])[0][0]

        // Assign the original category to the primary owner
        if (category.staffId !== primaryOwner) {
          console.log(`🔧 Assigning category "${category.name}" to primary owner: ${primaryOwner}`)
          await prisma.serviceCategory.update({
            where: { id: category.id },
            data: { staffId: primaryOwner },
          })
          fixed++
        }

        // Create duplicate categories for other businesses
        const otherOwners = Array.from(staffIdsUsingCategory).filter(id => id !== primaryOwner)
        for (const ownerId of otherOwners) {
          // Check if a category with this name already exists for this business
          const existing = await prisma.serviceCategory.findFirst({
            where: {
              name: category.name,
              staffId: ownerId,
            },
          })

          if (!existing) {
            console.log(`➕ Creating duplicate category "${category.name}" for business: ${ownerId}`)
            const newCategory = await prisma.serviceCategory.create({
              data: {
                name: category.name,
                staffId: ownerId,
              },
            })

            // Update services for this business to use the new category
            const servicesToUpdate = category.services.filter(s => s.staffId === ownerId)
            for (const service of servicesToUpdate) {
              await prisma.service.update({
                where: { id: service.id },
                data: { categoryId: newCategory.id },
              })
            }
            console.log(`   Updated ${servicesToUpdate.length} services to use new category`)
            fixed++
          } else {
            // Category already exists, just update services to use it
            const servicesToUpdate = category.services.filter(s => s.staffId === ownerId)
            for (const service of servicesToUpdate) {
              await prisma.service.update({
                where: { id: service.id },
                data: { categoryId: existing.id },
              })
            }
            console.log(`   Updated ${servicesToUpdate.length} services to use existing category`)
            fixed++
          }
        }
      }
    }

    console.log('\n✅ Fix complete!')
    console.log(`   Fixed: ${fixed}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Deleted: ${deleted}`)
  } catch (error) {
    console.error('❌ Error fixing categories:', error)
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
