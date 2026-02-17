-- AlterTable
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "userEmail" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "reviews_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "showOnCards" BOOLEAN NOT NULL DEFAULT true,
    "requirePurchase" BOOLEAN NOT NULL DEFAULT false,
    "allowGuestReviews" BOOLEAN NOT NULL DEFAULT true,
    "requireModeration" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_block_pkey" PRIMARY KEY ("id")
);
