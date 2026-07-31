-- CreateEnum
CREATE TYPE "WaybillTaskStatus" AS ENUM ('PLANNED', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "waybill_tasks" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeFrom" TEXT,
    "timeTo" TEXT,
    "direction" TEXT,
    "taskText" TEXT NOT NULL,
    "customerInfoText" TEXT,
    "contractId" TEXT,
    "deliveryCost" DECIMAL(12,2),
    "deliveryPayer" TEXT,
    "moversCost" DECIMAL(12,2),
    "moversPayer" TEXT,
    "responsibleUserId" TEXT,
    "driverUserId" TEXT,
    "status" "WaybillTaskStatus" NOT NULL DEFAULT 'PLANNED',
    "completionNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waybill_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waybill_tasks_date_idx" ON "waybill_tasks"("date");

-- CreateIndex
CREATE INDEX "waybill_tasks_driverUserId_date_idx" ON "waybill_tasks"("driverUserId", "date");

-- CreateIndex
CREATE INDEX "waybill_tasks_status_idx" ON "waybill_tasks"("status");

-- CreateIndex
CREATE INDEX "waybill_tasks_contractId_idx" ON "waybill_tasks"("contractId");

-- AddForeignKey
ALTER TABLE "waybill_tasks" ADD CONSTRAINT "waybill_tasks_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_tasks" ADD CONSTRAINT "waybill_tasks_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_tasks" ADD CONSTRAINT "waybill_tasks_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_tasks" ADD CONSTRAINT "waybill_tasks_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
