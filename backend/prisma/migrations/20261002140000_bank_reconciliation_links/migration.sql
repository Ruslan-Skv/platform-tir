-- Сверка «Банк ↔ ДП»: зафиксированные связи поступлений банка с оплатами из журнала ДП.

-- CreateTable
CREATE TABLE "bank_reconciliation_links" (
    "id" TEXT NOT NULL,
    "bankEntryId" TEXT NOT NULL,
    "moneyMovementId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_reconciliation_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_reconciliation_links_bankEntryId_moneyMovementId_key" ON "bank_reconciliation_links"("bankEntryId", "moneyMovementId");

-- CreateIndex
CREATE INDEX "bank_reconciliation_links_bankEntryId_idx" ON "bank_reconciliation_links"("bankEntryId");

-- CreateIndex
CREATE INDEX "bank_reconciliation_links_moneyMovementId_idx" ON "bank_reconciliation_links"("moneyMovementId");

-- CreateIndex
CREATE INDEX "bank_reconciliation_links_createdAt_idx" ON "bank_reconciliation_links"("createdAt");

-- AddForeignKey
ALTER TABLE "bank_reconciliation_links" ADD CONSTRAINT "bank_reconciliation_links_bankEntryId_fkey" FOREIGN KEY ("bankEntryId") REFERENCES "bank_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_links" ADD CONSTRAINT "bank_reconciliation_links_moneyMovementId_fkey" FOREIGN KEY ("moneyMovementId") REFERENCES "money_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_links" ADD CONSTRAINT "bank_reconciliation_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
