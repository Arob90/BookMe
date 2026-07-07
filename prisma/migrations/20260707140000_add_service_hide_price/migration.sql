-- Per-service flag to hide the price from public (profile + booking) for custom/quote-only services.
ALTER TABLE "services" ADD COLUMN "hide_price" BOOLEAN NOT NULL DEFAULT false;
