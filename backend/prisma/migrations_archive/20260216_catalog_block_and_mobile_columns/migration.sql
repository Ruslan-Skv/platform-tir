-- AlterTable
ALTER TABLE "user_notification_settings" ADD COLUMN IF NOT EXISTS "mobileCatalogColumns" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "defaultMobileCatalogColumns" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_block_pkey" PRIMARY KEY ("id")
);

-- Insert default catalog block if not exists
INSERT INTO "catalog_block" ("id", "defaultMobileCatalogColumns", "updatedAt")
VALUES ('main', 1, NOW())
ON CONFLICT ("id") DO NOTHING;
