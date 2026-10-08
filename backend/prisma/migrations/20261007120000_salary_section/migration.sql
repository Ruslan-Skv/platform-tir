-- CreateEnum
CREATE TYPE "SalaryRole" AS ENUM ('MANAGER', 'SURVEYOR', 'LEAD_SPECIALIST', 'BRIGADIER');

-- CreateEnum
CREATE TYPE "SalarySettlementStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateTable
CREATE TABLE "salary_global_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "brigadier1Percent" DECIMAL(5,2) NOT NULL DEFAULT 3.5,
    "brigadier2Percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "brigadeSplitCoeff" DECIMAL(6,4) NOT NULL DEFAULT 1.5882,
    "commonPoolToBrigadier" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vsPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "splitSign" DECIMAL(4,2) NOT NULL DEFAULT 0.7,
    "splitClose" DECIMAL(4,2) NOT NULL DEFAULT 0.3,
    "managerPercent" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "surveyorPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "brigadierPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_rate_rules" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "officeId" TEXT,
    "role" "SalaryRole" NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_rate_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_contracts" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "signedAt" DATE NOT NULL,
    "closedAt" DATE,
    "customerName" TEXT,
    "managerId" TEXT,
    "managerName" TEXT,
    "surveyorId" TEXT,
    "surveyorName" TEXT,
    "managerHandled" BOOLEAN NOT NULL DEFAULT true,
    "surveyorHandled" BOOLEAN NOT NULL DEFAULT true,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "managerPercentOverride" DECIMAL(5,2),
    "surveyorPercentOverride" DECIMAL(5,2),
    "vsPercentOverride" DECIMAL(5,2),
    "brigadierPercentOverride" DECIMAL(5,2),
    "source" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_contract_extra_bills" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_contract_extra_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_settlements" (
    "id" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "status" "SalarySettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salary_categories_code_key" ON "salary_categories"("code");

-- CreateIndex
CREATE INDEX "salary_rate_rules_officeId_idx" ON "salary_rate_rules"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "salary_rate_rules_categoryId_officeId_role_key" ON "salary_rate_rules"("categoryId", "officeId", "role");

-- CreateIndex
CREATE INDEX "salary_contracts_categoryId_idx" ON "salary_contracts"("categoryId");

-- CreateIndex
CREATE INDEX "salary_contracts_signedAt_idx" ON "salary_contracts"("signedAt");

-- CreateIndex
CREATE INDEX "salary_contracts_closedAt_idx" ON "salary_contracts"("closedAt");

-- CreateIndex
CREATE INDEX "salary_contracts_managerId_idx" ON "salary_contracts"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "salary_contracts_officeId_number_key" ON "salary_contracts"("officeId", "number");

-- CreateIndex
CREATE INDEX "salary_contract_extra_bills_contractId_idx" ON "salary_contract_extra_bills"("contractId");

-- CreateIndex
CREATE INDEX "salary_contract_extra_bills_date_idx" ON "salary_contract_extra_bills"("date");

-- CreateIndex
CREATE INDEX "salary_settlements_dateFrom_dateTo_idx" ON "salary_settlements"("dateFrom", "dateTo");

-- CreateIndex
CREATE INDEX "salary_settlements_createdAt_idx" ON "salary_settlements"("createdAt");

-- AddForeignKey
ALTER TABLE "salary_rate_rules" ADD CONSTRAINT "salary_rate_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "salary_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_rate_rules" ADD CONSTRAINT "salary_rate_rules_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_contracts" ADD CONSTRAINT "salary_contracts_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_contracts" ADD CONSTRAINT "salary_contracts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "salary_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_contracts" ADD CONSTRAINT "salary_contracts_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_contracts" ADD CONSTRAINT "salary_contracts_surveyorId_fkey" FOREIGN KEY ("surveyorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_contract_extra_bills" ADD CONSTRAINT "salary_contract_extra_bills_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "salary_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_settlements" ADD CONSTRAINT "salary_settlements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

