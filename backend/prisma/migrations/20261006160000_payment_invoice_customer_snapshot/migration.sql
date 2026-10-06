-- Свободные счета: снимок реквизитов заказчика (для печатной формы счёта).
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "customerSnapshot" JSONB;
