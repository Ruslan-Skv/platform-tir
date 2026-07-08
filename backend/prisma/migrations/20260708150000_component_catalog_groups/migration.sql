-- CreateTable
CREATE TABLE "component_catalog_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "series" TEXT,
    "categoryId" TEXT,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_catalog_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_catalog_group_items" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "component_catalog_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "component_catalog_groups_slug_key" ON "component_catalog_groups"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "component_catalog_group_items_groupId_catalogItemId_key" ON "component_catalog_group_items"("groupId", "catalogItemId");

-- AddForeignKey
ALTER TABLE "component_catalog_groups" ADD CONSTRAINT "component_catalog_groups_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_catalog_group_items" ADD CONSTRAINT "component_catalog_group_items_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "component_catalog_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_catalog_group_items" ADD CONSTRAINT "component_catalog_group_items_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "component_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
