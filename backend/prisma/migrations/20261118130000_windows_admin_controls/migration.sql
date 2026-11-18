-- AlterTable
ALTER TABLE "windows_page_block" ADD COLUMN     "comparisonNote" TEXT,
ADD COLUMN     "comparisonShow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "comparisonShowChambers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "comparisonShowDepth" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "comparisonShowGlass" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "comparisonShowSound" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "comparisonShowThermal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "comparisonTitle" TEXT,
ADD COLUMN     "ctaBackgroundColor" TEXT,
ADD COLUMN     "ctaBackgroundImage" TEXT,
ADD COLUMN     "ctaBackgroundImageOpacity" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "ctaShowButtons" BOOLEAN NOT NULL DEFAULT true;

