-- CreateTable
CREATE TABLE "component_catalog_series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_catalog_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "component_catalog_series_slug_key" ON "component_catalog_series"("slug");

-- AddForeignKey
ALTER TABLE "component_catalog_series" ADD CONSTRAINT "component_catalog_series_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "component_catalog_groups" ADD COLUMN "seriesId" TEXT;

-- Migrate existing subgroups into a default door-model group
INSERT INTO "component_catalog_series" ("id", "name", "description", "slug", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
    'cmlegacyseries000000000001',
    'Импортированные модели',
    'Автоматически создано при разделении на группы и подгруппы',
    'import-legacy-series',
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

UPDATE "component_catalog_groups"
SET "seriesId" = 'cmlegacyseries000000000001'
WHERE "seriesId" IS NULL;

-- CreateIndex
CREATE INDEX "component_catalog_groups_seriesId_idx" ON "component_catalog_groups"("seriesId");

-- AddForeignKey
ALTER TABLE "component_catalog_groups" ADD CONSTRAINT "component_catalog_groups_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "component_catalog_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make seriesId required
ALTER TABLE "component_catalog_groups" ALTER COLUMN "seriesId" SET NOT NULL;
