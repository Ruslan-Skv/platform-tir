-- Подписание выставленных счетов ПЭП со стороны Подрядчика:
-- отметка времени, подписант, подписанная копия PDF (со штампом) и её SHA-256.
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "signedAt" TIMESTAMP(3);
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "signedById" TEXT;
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "signedFileUrl" TEXT;
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "signedSha256" TEXT;

ALTER TABLE "contract_document_payment_invoices" ADD CONSTRAINT "contract_document_payment_invoices_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
