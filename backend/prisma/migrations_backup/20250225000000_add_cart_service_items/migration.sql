-- CreateTable
CREATE TABLE "cart_service_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceCatalogCategoryId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cart_service_items_userId_serviceCatalogCategoryId_key" ON "cart_service_items"("userId", "serviceCatalogCategoryId");

-- CreateIndex
CREATE INDEX "cart_service_items_userId_idx" ON "cart_service_items"("userId");

-- AddForeignKey
ALTER TABLE "cart_service_items" ADD CONSTRAINT "cart_service_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_service_items" ADD CONSTRAINT "cart_service_items_serviceCatalogCategoryId_fkey" FOREIGN KEY ("serviceCatalogCategoryId") REFERENCES "service_catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
