-- AlterTable
ALTER TABLE "settings" ADD COLUMN "max_users" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "pending_account_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "district" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_account_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_account_requests_email_key" ON "pending_account_requests"("email");
