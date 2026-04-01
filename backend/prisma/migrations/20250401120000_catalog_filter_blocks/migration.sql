-- CreateEnum
CREATE TYPE "CatalogFilterItemKind" AS ENUM ('ATTRIBUTE', 'STOCK', 'MANUFACTURER');

-- CreateTable
CREATE TABLE "catalog_filter_blocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL,
    "includeDescendants" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_filter_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_filter_block_items" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "kind" "CatalogFilterItemKind" NOT NULL,
    "attributeId" TEXT,
    "labelOverride" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catalog_filter_block_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_filter_blocks_categoryId_key" ON "catalog_filter_blocks"("categoryId");

-- AddForeignKey
ALTER TABLE "catalog_filter_blocks" ADD CONSTRAINT "catalog_filter_blocks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_filter_block_items" ADD CONSTRAINT "catalog_filter_block_items_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "catalog_filter_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_filter_block_items" ADD CONSTRAINT "catalog_filter_block_items_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
