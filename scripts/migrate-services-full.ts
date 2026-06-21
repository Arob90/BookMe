import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting full service migration...')

  try {
    // Step 1: Create service_categories table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS service_categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Created service_categories table')

    // Step 2: Add category_id column (nullable first)
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'services' AND column_name = 'category_id'
        ) THEN
          ALTER TABLE services ADD COLUMN category_id TEXT;
        END IF;
      END $$;
    `
    console.log('✅ Added category_id column')

    // Step 3: Get all existing services with their category strings
    const existingServices = await prisma.$queryRaw`
      SELECT id, category, name FROM services WHERE category IS NOT NULL
    ` as any[]

    if (existingServices.length > 0) {
      // Step 4: Create unique categories from existing service categories
      const uniqueCategories = [...new Set(existingServices.map((s) => s.category).filter(Boolean))]
      console.log(`📦 Found ${uniqueCategories.length} unique categories:`, uniqueCategories)

      // Step 5: Create ServiceCategory entries
      const categoryMap = new Map<string, string>()
      
      for (const catName of uniqueCategories) {
        // Generate ID
        const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        await prisma.$executeRaw`
          INSERT INTO service_categories (id, name, created_at)
          VALUES (${id}, ${catName}, NOW())
          ON CONFLICT (name) DO NOTHING
        `

        // Get the actual ID
        const category = await prisma.$queryRaw`
          SELECT id FROM service_categories WHERE name = ${catName} LIMIT 1
        ` as any[]
        
        if (category[0]) {
          categoryMap.set(catName, category[0].id)
          console.log(`✅ Created/Found category: ${catName} (${category[0].id})`)
        }
      }

      // Step 6: Create a default category
      const defaultId = 'cat_default_uncategorized'
      await prisma.$executeRaw`
        INSERT INTO service_categories (id, name, created_at)
        VALUES (${defaultId}, 'Uncategorized', NOW())
        ON CONFLICT (name) DO NOTHING
      `
      categoryMap.set('Uncategorized', defaultId)

      // Step 7: Update each service to use category_id
      for (const service of existingServices) {
        const categoryId = service.category 
          ? categoryMap.get(service.category) || defaultId
          : defaultId

        await prisma.$executeRaw`
          UPDATE services 
          SET category_id = ${categoryId}
          WHERE id = ${service.id}
        `
      }
      console.log(`✅ Updated ${existingServices.length} services with category_id`)

      // Step 8: Set category_id to NOT NULL
      await prisma.$executeRaw`
        UPDATE services 
        SET category_id = ${defaultId}
        WHERE category_id IS NULL
      `

      await prisma.$executeRaw`
        ALTER TABLE services 
        ALTER COLUMN category_id SET NOT NULL
      `
      console.log('✅ Made category_id required')

      // Step 9: Add foreign key constraint
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'services_category_id_fkey'
          ) THEN
            ALTER TABLE services 
            ADD CONSTRAINT services_category_id_fkey 
            FOREIGN KEY (category_id) REFERENCES service_categories(id);
          END IF;
        END $$;
      `
      console.log('✅ Added foreign key constraint')

      // Step 10: Add new columns if they don't exist
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'services' AND column_name = 'description'
          ) THEN
            ALTER TABLE services ADD COLUMN description TEXT;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'services' AND column_name = 'image_url'
          ) THEN
            ALTER TABLE services ADD COLUMN image_url TEXT;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'services' AND column_name = 'points_worth'
          ) THEN
            ALTER TABLE services ADD COLUMN points_worth INTEGER;
          END IF;
        END $$;
      `
      console.log('✅ Added new columns (description, image_url, points_worth)')
    }

    console.log('✅ Migration complete!')
    console.log('🔄 Now regenerating Prisma client...')
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
