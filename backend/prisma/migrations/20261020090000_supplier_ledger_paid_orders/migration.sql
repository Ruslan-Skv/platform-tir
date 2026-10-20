-- Ведомость поставщиков: FIFO-погашение счетов оплатами (paidAmount) и
-- разбивка счёта по заказам/договорам (supplier_ledger_entry_order_links).

-- AlterTable
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "supplier_ledger_entry_order_links" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_ledger_entry_order_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_ledger_entry_order_links_entryId_packageId_key" ON "supplier_ledger_entry_order_links"("entryId", "packageId");

-- CreateIndex
CREATE INDEX "supplier_ledger_entry_order_links_packageId_idx" ON "supplier_ledger_entry_order_links"("packageId");

-- AddForeignKey
ALTER TABLE "supplier_ledger_entry_order_links" ADD CONSTRAINT "supplier_ledger_entry_order_links_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "supplier_ledger_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_ledger_entry_order_links" ADD CONSTRAINT "supplier_ledger_entry_order_links_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Бэкfill старых строк «счёт + оплата в одной строке»: счёт считался оплаченным
-- на min(сумма, оплата). Дальнейшие пересчёты FIFO переведут всё на общий пул оплат.
UPDATE "supplier_ledger_entries"
SET "paidAmount" = LEAST(COALESCE("amount", 0), COALESCE("payment", 0))
WHERE "amount" IS NOT NULL AND "payment" IS NOT NULL;
