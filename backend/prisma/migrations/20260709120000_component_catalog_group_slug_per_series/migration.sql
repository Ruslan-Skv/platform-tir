-- DropIndex
DROP INDEX "component_catalog_groups_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "component_catalog_groups_seriesId_slug_key" ON "component_catalog_groups"("seriesId", "slug");
