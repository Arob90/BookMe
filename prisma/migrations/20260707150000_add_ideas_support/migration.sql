-- "Bring your idea to life" submissions and TechSupport bug reports.
CREATE TABLE "ideas" (
  "id" TEXT NOT NULL,
  "ref" TEXT NOT NULL,
  "staff_id" TEXT,
  "submitter_name" TEXT,
  "submitter_email" TEXT,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "public_note" TEXT,
  "updates" JSONB,
  "rewarded_days" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ideas_ref_key" ON "ideas" ("ref");
CREATE INDEX "ideas_status_updated_at_idx" ON "ideas" ("status", "updated_at" DESC);
CREATE INDEX "ideas_staff_id_idx" ON "ideas" ("staff_id");

CREATE TABLE "support_reports" (
  "id" TEXT NOT NULL,
  "ref" TEXT NOT NULL,
  "staff_id" TEXT,
  "submitter_name" TEXT,
  "submitter_email" TEXT,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "admin_note" TEXT,
  "rewarded_days" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "support_reports_ref_key" ON "support_reports" ("ref");
CREATE INDEX "support_reports_status_updated_at_idx" ON "support_reports" ("status", "updated_at" DESC);
CREATE INDEX "support_reports_staff_id_idx" ON "support_reports" ("staff_id");
