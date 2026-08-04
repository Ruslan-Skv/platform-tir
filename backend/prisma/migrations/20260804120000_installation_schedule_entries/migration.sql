-- CreateEnum
CREATE TYPE "InstallationScheduleStatus" AS ENUM ('PLANNED', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "installation_schedule_entries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeFrom" TEXT,
    "timeTo" TEXT,
    "timeText" TEXT,
    "direction" TEXT NOT NULL,
    "orderInfo" TEXT,
    "note" TEXT,
    "installerId" TEXT,
    "installerName" TEXT,
    "packageId" TEXT,
    "contractId" TEXT,
    "contractNumber" TEXT,
    "workOrderKey" TEXT,
    "workOrderLabel" TEXT,
    "customerName" TEXT,
    "customerAddress" TEXT,
    "customerPhone" TEXT,
    "customerPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "InstallationScheduleStatus" NOT NULL DEFAULT 'PLANNED',
    "completionNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdById" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "installation_schedule_entries_date_idx" ON "installation_schedule_entries"("date");
CREATE INDEX "installation_schedule_entries_direction_date_idx" ON "installation_schedule_entries"("direction", "date");
CREATE INDEX "installation_schedule_entries_installerId_date_idx" ON "installation_schedule_entries"("installerId", "date");
CREATE INDEX "installation_schedule_entries_packageId_idx" ON "installation_schedule_entries"("packageId");
CREATE INDEX "installation_schedule_entries_contractId_idx" ON "installation_schedule_entries"("contractId");
CREATE INDEX "installation_schedule_entries_status_idx" ON "installation_schedule_entries"("status");
CREATE INDEX "installation_schedule_entries_deleted_at_idx" ON "installation_schedule_entries"("deleted_at");
CREATE INDEX "installation_schedule_entries_createdById_idx" ON "installation_schedule_entries"("createdById");

-- AddForeignKey
ALTER TABLE "installation_schedule_entries" ADD CONSTRAINT "installation_schedule_entries_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "installer_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "installation_schedule_entries" ADD CONSTRAINT "installation_schedule_entries_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "installation_schedule_entries" ADD CONSTRAINT "installation_schedule_entries_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "installation_schedule_entries" ADD CONSTRAINT "installation_schedule_entries_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "installation_schedule_entries" ADD CONSTRAINT "installation_schedule_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "installation_schedule_entries" ADD CONSTRAINT "installation_schedule_entries_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
