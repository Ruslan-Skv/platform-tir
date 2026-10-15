-- Единый журнал выплат з/п вне заказ-нарядов: таблица salary_payouts,
-- типы способа/категории выплаты и получатель зар/платы у ручных записей ДП.

-- CreateEnum
CREATE TYPE "SalaryPayoutMethod" AS ENUM ('CASH', 'BANK');
CREATE TYPE "SalaryPayoutCategory" AS ENUM ('SALARY', 'ADVANCE', 'BONUS', 'OTHER');

-- CreateTable
CREATE TABLE "salary_payouts" (
    "id" TEXT NOT NULL,
    "paidAt" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "SalaryPayoutMethod" NOT NULL,
    "category" "SalaryPayoutCategory" NOT NULL DEFAULT 'SALARY',
    "recipientUserId" TEXT,
    "recipientName" TEXT NOT NULL,
    "managerId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_payouts_paidAt_idx" ON "salary_payouts"("paidAt");
CREATE INDEX "salary_payouts_paymentMethod_idx" ON "salary_payouts"("paymentMethod");
CREATE INDEX "salary_payouts_recipientUserId_idx" ON "salary_payouts"("recipientUserId");
CREATE INDEX "salary_payouts_managerId_idx" ON "salary_payouts"("managerId");
CREATE INDEX "salary_payouts_deletedAt_idx" ON "salary_payouts"("deletedAt");

-- AddForeignKey
ALTER TABLE "salary_payouts" ADD CONSTRAINT "salary_payouts_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "salary_payouts" ADD CONSTRAINT "salary_payouts_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "salary_payouts" ADD CONSTRAINT "salary_payouts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: получатель зар/платы ручной записи ДП с основанием «Зар/плата».
ALTER TABLE "money_movements" ADD COLUMN "salaryRecipientName" TEXT;
ALTER TABLE "money_movements" ADD COLUMN "salaryRecipientUserId" TEXT;

-- AddForeignKey
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_salaryRecipientUserId_fkey" FOREIGN KEY ("salaryRecipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
