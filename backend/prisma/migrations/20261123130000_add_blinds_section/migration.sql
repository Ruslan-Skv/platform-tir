-- CreateTable
CREATE TABLE "blinds_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blinds_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blinds_products" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "mountType" TEXT,
    "material" TEXT,
    "controlType" TEXT,
    "characteristics" JSONB,
    "advantages" TEXT[],
    "priceFrom" INTEGER,
    "badge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blinds_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blinds_page_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL DEFAULT 'Жалюзи',
    "subtitle" TEXT,
    "description" TEXT,
    "heroImageUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "comparisonShow" BOOLEAN NOT NULL DEFAULT true,
    "comparisonTitle" TEXT,
    "comparisonNote" TEXT,
    "comparisonShowMount" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowMaterial" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowControl" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowPrice" BOOLEAN NOT NULL DEFAULT true,
    "calcShow" BOOLEAN NOT NULL DEFAULT true,
    "calcTitle" TEXT,
    "calcNote" TEXT,
    "calcMountPrice" INTEGER NOT NULL DEFAULT 300,
    "calcMotorPrice" INTEGER NOT NULL DEFAULT 5500,
    "calcNoDrillPrice" INTEGER NOT NULL DEFAULT 400,
    "calcMinOrder" INTEGER NOT NULL DEFAULT 2500,
    "steps" JSONB,
    "faq" JSONB,
    "ctaBackgroundColor" TEXT,
    "ctaBackgroundImage" TEXT,
    "ctaBackgroundFit" TEXT NOT NULL DEFAULT 'contain',
    "ctaBackgroundImageOpacity" INTEGER NOT NULL DEFAULT 30,
    "ctaTextColor" TEXT,
    "ctaShowButtons" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blinds_page_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blinds_categories_slug_key" ON "blinds_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blinds_products_slug_key" ON "blinds_products"("slug");

-- CreateIndex
CREATE INDEX "blinds_products_categoryId_idx" ON "blinds_products"("categoryId");

-- AddForeignKey
ALTER TABLE "blinds_products" ADD CONSTRAINT "blinds_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blinds_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
