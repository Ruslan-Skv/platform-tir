-- Дочерние категории в каталоге «Ремонт квартир»
ALTER TABLE "service_catalog_categories" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

CREATE INDEX IF NOT EXISTS "service_catalog_categories_parentId_idx" ON "service_catalog_categories"("parentId");

ALTER TABLE "service_catalog_categories" DROP CONSTRAINT IF EXISTS "service_catalog_categories_parentId_fkey";

ALTER TABLE "service_catalog_categories" ADD CONSTRAINT "service_catalog_categories_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "service_catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
