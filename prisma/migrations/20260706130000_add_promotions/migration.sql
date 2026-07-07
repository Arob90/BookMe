-- Owner-posted promotions shown on the business profile and sponsored rails.
CREATE TABLE "promotions" (
  "id" TEXT NOT NULL,
  "staff_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotions_staff_id_created_at_idx" ON "promotions" ("staff_id", "created_at" DESC);
CREATE INDEX "promotions_is_active_ends_at_idx" ON "promotions" ("is_active", "ends_at");
