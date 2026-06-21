ALTER TABLE "reminders" ADD COLUMN "notes" TEXT;
ALTER TABLE "reminders" ADD COLUMN "action_type" TEXT NOT NULL DEFAULT 'task';
ALTER TABLE "reminders" ADD COLUMN "metadata" JSONB;
