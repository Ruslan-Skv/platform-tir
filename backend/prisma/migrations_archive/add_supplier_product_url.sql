-- Добавление поля supplierProductUrl в таблицу product_suppliers
-- Это поле хранит ссылку на товар у поставщика для автоматического получения цены

ALTER TABLE "product_suppliers" 
ADD COLUMN IF NOT EXISTS "supplierProductUrl" TEXT;

-- Комментарий к полю для документации
COMMENT ON COLUMN "product_suppliers"."supplierProductUrl" IS 'Ссылка на товар у поставщика для автоматического получения цены';
