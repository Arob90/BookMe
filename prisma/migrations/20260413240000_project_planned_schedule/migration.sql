-- AlterTable
ALTER TABLE "projects" ADD COLUMN "planned_duration_minutes" INTEGER,
ADD COLUMN "planned_duration_unit" TEXT DEFAULT 'MINUTES',
ADD COLUMN "estimated_due_at" TIMESTAMP(3);
