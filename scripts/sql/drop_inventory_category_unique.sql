-- Allow per-business inventory categories by removing the old global unique constraint on name
-- (created by `name @unique` on InventoryCategory).
--
-- Safe to run multiple times.
ALTER TABLE "inventory_categories" DROP CONSTRAINT IF EXISTS "inventory_categories_name_key";

