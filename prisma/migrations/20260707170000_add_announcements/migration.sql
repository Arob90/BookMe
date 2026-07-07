-- One-time celebratory / info modals queued for a business owner.
CREATE TABLE "announcements" (
  "id" TEXT NOT NULL,
  "staff_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "meta" JSONB,
  "acknowledged_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "announcements_staff_id_acknowledged_at_idx" ON "announcements" ("staff_id", "acknowledged_at");
