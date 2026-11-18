-- CreateTable
CREATE TABLE "window_brands" (
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

    CONSTRAINT "window_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "window_profile_systems" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "chambers" INTEGER,
    "mountingDepth" INTEGER,
    "glassUnitWidth" TEXT,
    "thermalResistance" TEXT,
    "soundInsulation" TEXT,
    "characteristics" JSONB,
    "advantages" TEXT[],
    "priceFrom" INTEGER,
    "badge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "window_profile_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "windows_page_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL DEFAULT 'Пластиковые окна',
    "subtitle" TEXT,
    "description" TEXT,
    "heroImageUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "windows_page_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "window_brands_slug_key" ON "window_brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "window_profile_systems_slug_key" ON "window_profile_systems"("slug");

-- CreateIndex
CREATE INDEX "window_profile_systems_brandId_idx" ON "window_profile_systems"("brandId");

-- AddForeignKey
ALTER TABLE "window_profile_systems" ADD CONSTRAINT "window_profile_systems_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "window_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

