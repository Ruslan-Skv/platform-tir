-- Бухгалтерия → Банк: ручной учёт поступлений на расчётные счета банков.

-- CreateEnum
CREATE TYPE "BankCode" AS ENUM ('SBER', 'ALFA', 'OTHER');

-- CreateEnum
CREATE TYPE "BankEntryType" AS ENUM ('DEPOSIT', 'ACQUIRING', 'SBP', 'INVOICE_PAYMENT', 'PERSONAL_CARD');

-- CreateTable
CREATE TABLE "bank_entries" (
    "id" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "bank" "BankCode" NOT NULL,
    "entryType" "BankEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refund" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "counterparty" VARCHAR(500),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_entries_entryDate_idx" ON "bank_entries"("entryDate");

-- CreateIndex
CREATE INDEX "bank_entries_bank_idx" ON "bank_entries"("bank");

-- CreateIndex
CREATE INDEX "bank_entries_entryType_idx" ON "bank_entries"("entryType");

-- AddForeignKey
ALTER TABLE "bank_entries" ADD CONSTRAINT "bank_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
