-- Leads from public "list your business / advertise" CTAs.
CREATE TABLE "listing_requests" (
  "id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT NOT NULL,
  "message" TEXT,
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listing_requests_created_at_idx" ON "listing_requests" ("created_at" DESC);
CREATE INDEX "listing_requests_status_created_at_idx" ON "listing_requests" ("status", "created_at" DESC);
