-- AlterTable
ALTER TABLE "component_catalog_series" ADD COLUMN "supplierId" TEXT;

-- CreateIndex
CREATE INDEX "component_catalog_series_supplierId_idx" ON "component_catalog_series"("supplierId");

-- AddForeignKey
ALTER TABLE "component_catalog_series" ADD CONSTRAINT "component_catalog_series_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
