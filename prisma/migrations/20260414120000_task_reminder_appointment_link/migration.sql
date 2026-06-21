-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "appointment_id" TEXT;

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN "appointment_id" TEXT;

-- CreateIndex
CREATE INDEX "tasks_appointment_id_idx" ON "tasks"("appointment_id");

-- CreateIndex
CREATE INDEX "reminders_appointment_id_idx" ON "reminders"("appointment_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
