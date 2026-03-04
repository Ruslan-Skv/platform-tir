-- CreateTable
CREATE TABLE "order_service_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "serviceCatalogItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_service_items_orderId_idx" ON "order_service_items"("orderId");

-- CreateIndex
CREATE INDEX "order_service_items_serviceCatalogItemId_idx" ON "order_service_items"("serviceCatalogItemId");

-- AddForeignKey
ALTER TABLE "order_service_items" ADD CONSTRAINT "order_service_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_service_items" ADD CONSTRAINT "order_service_items_serviceCatalogItemId_fkey" FOREIGN KEY ("serviceCatalogItemId") REFERENCES "service_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
