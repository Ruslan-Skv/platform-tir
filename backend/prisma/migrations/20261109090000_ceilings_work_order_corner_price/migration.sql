-- Стоимость одного угла в заказ-наряде потолков (null — не задана, строка «Углы» не добавляется).
ALTER TABLE "contract_document_repair_settings" ADD COLUMN "ceilingsWorkOrderCornerPrice" INTEGER;
