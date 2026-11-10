-- Минимальная оплата для Акта начала работ по ремонту (null — не задана, берётся 70%).
ALTER TABLE "contract_document_repair_settings" ADD COLUMN "repairWorkStartMinPayPercent" INTEGER;
