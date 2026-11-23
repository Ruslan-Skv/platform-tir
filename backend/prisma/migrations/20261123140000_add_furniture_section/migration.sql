-- CreateTable
CREATE TABLE "furniture_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "furniture_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furniture_products" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "configuration" TEXT,
    "facadeMaterial" TEXT,
    "hardware" TEXT,
    "characteristics" JSONB,
    "advantages" TEXT[],
    "priceFrom" INTEGER,
    "priceUnit" TEXT,
    "badge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "furniture_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furniture_page_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL DEFAULT 'Мебель',
    "subtitle" TEXT,
    "description" TEXT,
    "heroImageUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "comparisonShow" BOOLEAN NOT NULL DEFAULT true,
    "comparisonTitle" TEXT,
    "comparisonNote" TEXT,
    "comparisonShowConfiguration" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowFacade" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowHardware" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowPrice" BOOLEAN NOT NULL DEFAULT true,
    "materialsShow" BOOLEAN NOT NULL DEFAULT true,
    "materialsTitle" TEXT,
    "materials" JSONB,
    "calcShow" BOOLEAN NOT NULL DEFAULT true,
    "calcTitle" TEXT,
    "calcNote" TEXT,
    "calcAssemblyPrice" INTEGER NOT NULL DEFAULT 3000,
    "calcDeliveryPrice" INTEGER NOT NULL DEFAULT 1500,
    "calcPremiumHardwarePrice" INTEGER NOT NULL DEFAULT 5900,
    "calcMinOrder" INTEGER NOT NULL DEFAULT 15000,
    "steps" JSONB,
    "faq" JSONB,
    "ctaBackgroundColor" TEXT,
    "ctaBackgroundImage" TEXT,
    "ctaBackgroundFit" TEXT NOT NULL DEFAULT 'contain',
    "ctaBackgroundImageOpacity" INTEGER NOT NULL DEFAULT 30,
    "ctaTextColor" TEXT,
    "ctaShowButtons" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "furniture_page_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "furniture_categories_slug_key" ON "furniture_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "furniture_products_slug_key" ON "furniture_products"("slug");

-- CreateIndex
CREATE INDEX "furniture_products_categoryId_idx" ON "furniture_products"("categoryId");

-- AddForeignKey
ALTER TABLE "furniture_products" ADD CONSTRAINT "furniture_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "furniture_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
