-- Наценка на группу работ (категорию), % к базовой цене позиции
ALTER TABLE "service_catalog_categories"
ADD COLUMN "priceMarkupPercent" DECIMAL(10, 2) NOT NULL DEFAULT 0;
