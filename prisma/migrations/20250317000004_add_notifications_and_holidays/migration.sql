-- AlterTable
ALTER TABLE "settings" ADD COLUMN "notification_settings" JSONB;

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "repeat_yearly" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "holidays_staff_id_idx" ON "holidays"("staff_id");

-- CreateIndex
CREATE INDEX "holidays_staff_id_date_idx" ON "holidays"("staff_id", "date");
