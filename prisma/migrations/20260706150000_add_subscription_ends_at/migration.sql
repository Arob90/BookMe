-- Add subscription expiry to business owner accounts.
-- Nullable: existing accounts have no expiry (treated as unlimited) until an admin sets one.
ALTER TABLE "users" ADD COLUMN "subscription_ends_at" TIMESTAMP(3);
