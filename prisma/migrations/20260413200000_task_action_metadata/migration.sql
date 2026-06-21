-- Task quick-action types and participant payload (staff user ids, client ids, optional phone/email overrides).
ALTER TABLE "tasks" ADD COLUMN "action_type" TEXT NOT NULL DEFAULT 'task';
ALTER TABLE "tasks" ADD COLUMN "metadata" JSONB;
