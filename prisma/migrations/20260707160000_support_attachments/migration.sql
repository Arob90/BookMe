-- Screenshot / file attachments for bug reports (Vercel Blob URLs).
ALTER TABLE "support_reports" ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
