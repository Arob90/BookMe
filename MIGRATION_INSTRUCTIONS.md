# Migration Instructions for Adding staffId to Services and Inventory

## Step 1: Stop the Development Server
Stop your `npm run dev` server if it's running (Ctrl+C in the terminal where it's running).

## Step 2: Regenerate Prisma Client
Run this command:
```bash
npx prisma generate
```

## Step 3: Create and Apply Migration
Run this command:
```bash
npx prisma migrate dev --name add_staff_id_to_services_and_inventory
```

This will:
1. Create a migration file that adds `staff_id` columns to `services` and `inventory_items` tables
2. Apply the migration to your database
3. Regenerate the Prisma client

## Step 4: Restart Development Server
After the migration completes, restart your dev server:
```bash
npm run dev
```

## Note
The `staffId` field is optional in the schema, so existing services and inventory items will have `null` values. These won't show up for any business (they're filtered out). New businesses will start with blank services and inventory, and all new items will be automatically assigned to the creating business.
