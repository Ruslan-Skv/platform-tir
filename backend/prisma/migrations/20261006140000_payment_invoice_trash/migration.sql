-- Корзина выставленных счетов (по аналогии с корзиной журнала ДП):
-- удалённые супер-админом счета хранятся 30 дней, затем удаляются безвозвратно.
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "deletedById" TEXT;

CREATE INDEX "contract_document_payment_invoices_deletedAt_idx" ON "contract_document_payment_invoices"("deletedAt");

ALTER TABLE "contract_document_payment_invoices" ADD CONSTRAINT "contract_document_payment_invoices_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
