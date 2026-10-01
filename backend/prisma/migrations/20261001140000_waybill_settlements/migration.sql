-- Расчёт з/п водителя: закрывает выполненные задания и пишет запись в историю расчётов.
ALTER TYPE "WaybillTaskStatus" ADD VALUE 'CLOSED';

-- CreateTable
CREATE TABLE "waybill_settlements" (
    "id" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "driverUserId" TEXT,
    "payoutAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "moversTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "collectedFromCustomers" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tasksCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waybill_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waybill_settlements_driverUserId_idx" ON "waybill_settlements"("driverUserId");

-- CreateIndex
CREATE INDEX "waybill_settlements_createdAt_idx" ON "waybill_settlements"("createdAt");

-- AddForeignKey
ALTER TABLE "waybill_settlements" ADD CONSTRAINT "waybill_settlements_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_settlements" ADD CONSTRAINT "waybill_settlements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddColumn: задание, закрытое расчётом
ALTER TABLE "waybill_tasks" ADD COLUMN "settlementId" TEXT;

-- CreateIndex
CREATE INDEX "waybill_tasks_settlementId_idx" ON "waybill_tasks"("settlementId");

-- AddForeignKey
ALTER TABLE "waybill_tasks" ADD CONSTRAINT "waybill_tasks_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "waybill_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
