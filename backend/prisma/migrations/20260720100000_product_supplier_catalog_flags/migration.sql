-- AlterTable
ALTER TABLE "product_suppliers" ADD COLUMN IF NOT EXISTS "supplierCatalogNewAt" TIMESTAMP(3);
ALTER TABLE "product_suppliers" ADD COLUMN IF NOT EXISTS "supplierCatalogMissingAt" TIMESTAMP(3);
