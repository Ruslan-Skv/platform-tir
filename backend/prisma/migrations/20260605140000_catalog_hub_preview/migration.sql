-- CreateTable
CREATE TABLE "catalog_hub_preview_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "productsPerGroup" INTEGER NOT NULL DEFAULT 6,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_hub_preview_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_hub_preview_sections" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL DEFAULT 'main',
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_hub_preview_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_hub_preview_product_picks" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catalog_hub_preview_product_picks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_hub_preview_sections_settingsId_categoryId_key" ON "catalog_hub_preview_sections"("settingsId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_hub_preview_product_picks_sectionId_productId_mode_key" ON "catalog_hub_preview_product_picks"("sectionId", "productId", "mode");

-- AddForeignKey
ALTER TABLE "catalog_hub_preview_sections" ADD CONSTRAINT "catalog_hub_preview_sections_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "catalog_hub_preview_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_hub_preview_sections" ADD CONSTRAINT "catalog_hub_preview_sections_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_hub_preview_product_picks" ADD CONSTRAINT "catalog_hub_preview_product_picks_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "catalog_hub_preview_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_hub_preview_product_picks" ADD CONSTRAINT "catalog_hub_preview_product_picks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default settings row
INSERT INTO "catalog_hub_preview_settings" ("id", "productsPerGroup", "updatedAt")
VALUES ('main', 6, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
