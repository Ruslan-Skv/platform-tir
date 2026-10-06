-- Свободные счета без договора в базе: packageId становится nullable,
-- реквизиты договора/заказчика/исполнителя хранятся снимком в самой записи счёта.
ALTER TABLE "contract_document_payment_invoices" ALTER COLUMN "packageId" DROP NOT NULL;

ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "contractNumber" TEXT;
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "contractDate" TIMESTAMP(3);
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "customerId" TEXT;
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "customerName" TEXT;
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "executorProfile" JSONB;
