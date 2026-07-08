-- CreateEnum
CREATE TYPE "ComponentKind" AS ENUM ('STOIKA_KOROBKI', 'NALICHNIK', 'DOBOR', 'PRITVORNAYA_PLANKA', 'KOROBKA', 'OTHER');

-- CreateTable
CREATE TABLE "component_catalog_items" (
    "id" TEXT NOT NULL,
    "kind" "ComponentKind" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "material" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "kitQuantity" DOUBLE PRECISION,
    "quantityStep" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "component_catalog_items_slug_key" ON "component_catalog_items"("slug");

-- AlterTable
ALTER TABLE "product_components" ADD COLUMN "catalogItemId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "componentId" TEXT,
ADD COLUMN "componentLabel" TEXT,
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION USING "quantity"::double precision;

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "component_catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "product_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
