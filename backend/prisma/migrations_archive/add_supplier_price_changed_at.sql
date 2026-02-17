-- Пометка «цена поставщика изменилась» при массовой синхронизации

ALTER TABLE "product_suppliers"
ADD COLUMN IF NOT EXISTS "supplierPriceChangedAt" TIMESTAMP(3);

COMMENT ON COLUMN "product_suppliers"."supplierPriceChangedAt" IS 'Дата, когда при синхронизации обнаружили изменение цены поставщика';
