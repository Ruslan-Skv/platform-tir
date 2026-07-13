-- CreateTable
CREATE TABLE "supplier_price_list_snapshots" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT,
    "priceListDate" TEXT,
    "parserCode" TEXT NOT NULL DEFAULT 'STROYKOM_MK',
    "sheetName" TEXT NOT NULL DEFAULT 'Межкомнатные двери с фото',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_price_list_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_price_list_rows" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "blockTitle" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "size" TEXT,
    "material" TEXT,
    "variantNote" TEXT,
    "priceRrc" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "supplier_price_list_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_price_list_row_mappings" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_price_list_row_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_price_list_snapshots_supplierId_idx" ON "supplier_price_list_snapshots"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_price_list_snapshots_createdAt_idx" ON "supplier_price_list_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "supplier_price_list_rows_snapshotId_idx" ON "supplier_price_list_rows"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_price_list_rows_snapshotId_rowKey_key" ON "supplier_price_list_rows"("snapshotId", "rowKey");

-- CreateIndex
CREATE INDEX "supplier_price_list_row_mappings_catalogItemId_idx" ON "supplier_price_list_row_mappings"("catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_price_list_row_mappings_supplierId_rowKey_key" ON "supplier_price_list_row_mappings"("supplierId", "rowKey");

-- AddForeignKey
ALTER TABLE "supplier_price_list_snapshots" ADD CONSTRAINT "supplier_price_list_snapshots_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_list_snapshots" ADD CONSTRAINT "supplier_price_list_snapshots_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_list_rows" ADD CONSTRAINT "supplier_price_list_rows_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "supplier_price_list_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_list_row_mappings" ADD CONSTRAINT "supplier_price_list_row_mappings_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_list_row_mappings" ADD CONSTRAINT "supplier_price_list_row_mappings_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "component_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
