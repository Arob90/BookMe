-- Holiday special hours (open/closed + times). Safe if columns already exist from `db push`:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'holidays' AND column_name = 'is_open'
  ) THEN
    ALTER TABLE "holidays" ADD COLUMN "is_open" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'holidays' AND column_name = 'open_at'
  ) THEN
    ALTER TABLE "holidays" ADD COLUMN "open_at" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'holidays' AND column_name = 'close_at'
  ) THEN
    ALTER TABLE "holidays" ADD COLUMN "close_at" TEXT;
  END IF;
END $$;
