-- CreateEnum
CREATE TYPE "SupplierPriceListCategory" AS ENUM ('TRIM', 'INTERIOR_DOOR', 'STEEL_DOOR');

-- AlterTable
ALTER TABLE "supplier_price_list_snapshots" ADD COLUMN "category" "SupplierPriceListCategory" NOT NULL DEFAULT 'TRIM';

-- CreateIndex
CREATE INDEX "supplier_price_list_snapshots_supplierId_category_idx" ON "supplier_price_list_snapshots"("supplierId", "category");
