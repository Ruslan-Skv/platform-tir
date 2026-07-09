ALTER TABLE "product_suppliers"
  ADD COLUMN "supplierPriceSyncError" TEXT,
  ADD COLUMN "supplierPriceSyncErrorCode" TEXT,
  ADD COLUMN "supplierPriceSyncErrorAt" TIMESTAMP(3);
