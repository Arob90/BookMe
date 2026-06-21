import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Migrating services to use categories...')

  // First, get all existing services with their category strings
  const existingServices = await prisma.$queryRaw`
    SELECT id, category, name FROM services
  ` as any[]

  if (existingServices.length === 0) {
    console.log('✅ No services to migrate')
    return
  }

  // Create unique categories from existing service categories
  const uniqueCategories = [...new Set(existingServices.map((s) => s.category).filter(Boolean))]
  console.log(`📦 Found ${uniqueCategories.length} unique categories:`, uniqueCategories)

  // Create ServiceCategory entries
  const categoryMap = new Map<string, string>()
  
  for (const catName of uniqueCategories) {
    const category = await prisma.serviceCategory.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    })
    categoryMap.set(catName, category.id)
    console.log(`✅ Created/Found category: ${catName} (${category.id})`)
  }

  // Create a default category if needed
  const defaultCategory = await prisma.serviceCategory.upsert({
    where: { name: 'Uncategorized' },
    update: {},
    create: { name: 'Uncategorized' },
  })

  // Now update each service to use category_id
  for (const service of existingServices) {
    const categoryId = service.category 
      ? categoryMap.get(service.category) || defaultCategory.id
      : defaultCategory.id

    await prisma.$executeRaw`
      UPDATE services 
      SET category_id = ${categoryId}
      WHERE id = ${service.id}
    `
    console.log(`✅ Updated service: ${service.name}`)
  }

  console.log('✅ Migration complete!')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
