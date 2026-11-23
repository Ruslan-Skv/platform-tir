-- CreateTable
CREATE TABLE "ceiling_manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "country" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ceiling_manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ceiling_fabrics" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "textureType" TEXT,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "width" TEXT,
    "characteristics" JSONB,
    "advantages" TEXT[],
    "priceFrom" INTEGER,
    "badge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ceiling_fabrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stretch_ceilings_page_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL DEFAULT 'Натяжные потолки',
    "subtitle" TEXT,
    "description" TEXT,
    "heroImageUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "comparisonShow" BOOLEAN NOT NULL DEFAULT true,
    "comparisonTitle" TEXT,
    "comparisonNote" TEXT,
    "comparisonShowTexture" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowWidth" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowPrice" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowCountry" BOOLEAN NOT NULL DEFAULT true,
    "calcShow" BOOLEAN NOT NULL DEFAULT true,
    "calcTitle" TEXT,
    "calcNote" TEXT,
    "calcPricePerMeterBaget" INTEGER NOT NULL DEFAULT 180,
    "calcPricePerCorner" INTEGER NOT NULL DEFAULT 150,
    "calcPricePerLight" INTEGER NOT NULL DEFAULT 450,
    "calcPricePerPipe" INTEGER NOT NULL DEFAULT 350,
    "calcLightOptionPrice" INTEGER NOT NULL DEFAULT 600,
    "calcCorniceOptionPrice" INTEGER NOT NULL DEFAULT 900,
    "calcMinOrder" INTEGER NOT NULL DEFAULT 3000,
    "steps" JSONB,
    "faq" JSONB,
    "ctaBackgroundColor" TEXT,
    "ctaBackgroundImage" TEXT,
    "ctaBackgroundFit" TEXT NOT NULL DEFAULT 'contain',
    "ctaBackgroundImageOpacity" INTEGER NOT NULL DEFAULT 30,
    "ctaTextColor" TEXT,
    "ctaShowButtons" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stretch_ceilings_page_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ceiling_manufacturers_slug_key" ON "ceiling_manufacturers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ceiling_fabrics_slug_key" ON "ceiling_fabrics"("slug");

-- CreateIndex
CREATE INDEX "ceiling_fabrics_manufacturerId_idx" ON "ceiling_fabrics"("manufacturerId");

-- AddForeignKey
ALTER TABLE "ceiling_fabrics" ADD CONSTRAINT "ceiling_fabrics_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "ceiling_manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

