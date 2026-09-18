-- Глобальные налог и наценка заказ-наряда по ремонту (null — не заданы, берутся из данных пакета).
ALTER TABLE "contract_document_repair_settings" ADD COLUMN "repairWorkOrderMarkupPercent" INTEGER;
ALTER TABLE "contract_document_repair_settings" ADD COLUMN "repairWorkOrderTaxPercent" INTEGER;
