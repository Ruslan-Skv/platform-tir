-- Порядок значений внутри фильтра по атрибуту
CREATE TYPE "CatalogFilterOptionsSort" AS ENUM ('NUMERIC_DESC', 'TEXT_ASC', 'MANUAL');

ALTER TABLE "catalog_filter_block_items"
ADD COLUMN "optionsSort" "CatalogFilterOptionsSort" NOT NULL DEFAULT 'NUMERIC_DESC';

ALTER TABLE "catalog_filter_block_items"
ADD COLUMN "manualOptionOrder" JSONB;
