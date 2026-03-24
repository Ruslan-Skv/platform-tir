-- Переименование «Каталог услуг» в «Ремонт квартир» (навигация и блок каталога)
-- Миграция только данных, без изменения схемы. Безопасна для повторного запуска.

UPDATE "navigation_items"
SET "name" = 'Ремонт квартир'
WHERE "href" = '/catalog/services'
  AND "name" = 'Каталог услуг';

UPDATE "service_catalog_block"
SET "title" = 'Ремонт квартир'
WHERE "title" = 'Каталог услуг';
