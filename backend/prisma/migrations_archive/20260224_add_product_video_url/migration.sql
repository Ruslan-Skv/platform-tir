-- Add videoUrl to products (URL видеоролика о товаре)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
