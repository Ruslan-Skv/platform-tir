-- Добавить настройку «Показывать цены» для каждой категории каталога услуг
ALTER TABLE "service_catalog_categories" ADD COLUMN IF NOT EXISTS "showPricesInPublic" BOOLEAN NOT NULL DEFAULT true;
