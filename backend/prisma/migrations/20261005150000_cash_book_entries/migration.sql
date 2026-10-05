-- Раздел «Касса»: собственные ручные записи движений наличных ДС.
-- Отдельно от журнала ДП: записи кассы не попадают в ДП
-- и не участвуют в его сверке и остатках кассы под инкассацию.
CREATE TABLE "cash_book_entries" (
    "id" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "managerId" TEXT,
    "direction" TEXT,
    "contractNumber" TEXT,
    "customerName" TEXT,
    "executorName" TEXT,
    "basis" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_book_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cash_book_entries_paymentDate_idx" ON "cash_book_entries"("paymentDate");
CREATE INDEX "cash_book_entries_managerId_idx" ON "cash_book_entries"("managerId");
CREATE INDEX "cash_book_entries_createdById_idx" ON "cash_book_entries"("createdById");

ALTER TABLE "cash_book_entries" ADD CONSTRAINT "cash_book_entries_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_book_entries" ADD CONSTRAINT "cash_book_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
