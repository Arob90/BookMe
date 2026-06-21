-- Per-business category display order on booking / services UI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE "service_categories" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "service_categories_staff_id_sort_order_idx" ON "service_categories"("staff_id", "sort_order");
