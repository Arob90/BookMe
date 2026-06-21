-- CreateTable
CREATE TABLE "billing_history_events" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "metadata" JSONB,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_history_events_staff_id_created_at_idx" ON "billing_history_events"("staff_id", "created_at" DESC);
