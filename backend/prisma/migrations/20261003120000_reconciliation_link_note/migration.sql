-- Пометка и числовое расхождение сумм в связи сверки (сверка не блокируется).
ALTER TABLE "bank_reconciliation_links" ADD COLUMN "note" TEXT;
ALTER TABLE "bank_reconciliation_links" ADD COLUMN "mismatchAmount" DECIMAL(12, 2);
