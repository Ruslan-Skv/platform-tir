-- AlterTable
ALTER TABLE "service_catalog_block" ADD COLUMN     "ctaBackgroundColor" TEXT,
ADD COLUMN     "ctaBackgroundFit" TEXT NOT NULL DEFAULT 'contain',
ADD COLUMN     "ctaBackgroundImage" TEXT,
ADD COLUMN     "ctaBackgroundImageOpacity" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "ctaShowButtons" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ctaText" TEXT,
ADD COLUMN     "ctaTextColor" TEXT,
ADD COLUMN     "ctaTitle" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "heroNotes" JSONB,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoText" TEXT,
ADD COLUMN     "seoTextTitle" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "steps" JSONB,
ADD COLUMN     "subtitle" TEXT;

