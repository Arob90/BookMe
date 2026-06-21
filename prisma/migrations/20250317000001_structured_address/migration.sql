-- Add structured address fields
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "address_line1" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "address_line2" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "country" TEXT;

-- Migrate old single 'address' column if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'address') THEN
    UPDATE clients SET address_line1 = address WHERE address IS NOT NULL;
    ALTER TABLE clients DROP COLUMN address;
  END IF;
END $$;
