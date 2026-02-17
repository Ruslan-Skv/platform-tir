-- Remove otherExpenses from contract_payments (proчие расходы moved to per-office tables)
ALTER TABLE "contract_payments" DROP COLUMN IF EXISTS "otherExpenses";

-- CreateTable: прочие расходы (бытовые нужды) по офисам
CREATE TABLE "office_other_expenses" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseDate" DATE NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_other_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: инкассации по офисам
CREATE TABLE "office_incassations" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "incassationDate" DATE NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_incassations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "office_other_expenses_officeId_idx" ON "office_other_expenses"("officeId");
CREATE INDEX "office_other_expenses_expenseDate_idx" ON "office_other_expenses"("expenseDate");
CREATE INDEX "office_incassations_officeId_idx" ON "office_incassations"("officeId");
CREATE INDEX "office_incassations_incassationDate_idx" ON "office_incassations"("incassationDate");

-- AddForeignKey
ALTER TABLE "office_other_expenses" ADD CONSTRAINT "office_other_expenses_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "office_other_expenses" ADD CONSTRAINT "office_other_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "office_incassations" ADD CONSTRAINT "office_incassations_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "office_incassations" ADD CONSTRAINT "office_incassations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
