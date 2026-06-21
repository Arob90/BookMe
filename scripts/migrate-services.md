# Migration Steps for Service Categories

## Important: Stop your dev server first!

1. **Stop the dev server** (Ctrl+C)

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Create and apply migration:**
   ```bash
   npx prisma migrate dev --name add_service_categories
   ```

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## What this migration does:
- Creates a new `service_categories` table
- Adds `category_id` foreign key to `services` table
- Migrates existing category strings to the new category system
- Adds new fields: `description`, `image_url`, `points_worth`

## Note:
If you have existing services with string categories, you may need to manually create categories first or update the migration script to handle the migration automatically.
