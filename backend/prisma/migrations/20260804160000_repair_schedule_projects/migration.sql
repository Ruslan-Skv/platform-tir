-- CreateEnum
CREATE TYPE "RepairScheduleProjectStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "RepairScheduleEntryKind" AS ENUM ('WEEKLY', 'MILESTONE', 'NOTE');

-- CreateTable
CREATE TABLE "repair_schedule_projects" (
    "id" TEXT NOT NULL,
    "status" "RepairScheduleProjectStatus" NOT NULL DEFAULT 'NEW',
    "contractNumber" TEXT,
    "workScope" TEXT,
    "installerId" TEXT,
    "installerName" TEXT,
    "packageId" TEXT,
    "contractId" TEXT,
    "customerName" TEXT,
    "customerAddress" TEXT,
    "customerPhone" TEXT,
    "contractSum" DECIMAL(12,2),
    "payoutSum" DECIMAL(12,2),
    "furnitureInfo" TEXT,
    "plannedStartDate" DATE,
    "closedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_schedule_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_schedule_entries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "RepairScheduleEntryKind" NOT NULL DEFAULT 'WEEKLY',
    "text" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repair_schedule_projects_status_idx" ON "repair_schedule_projects"("status");
CREATE INDEX "repair_schedule_projects_installerId_idx" ON "repair_schedule_projects"("installerId");
CREATE INDEX "repair_schedule_projects_packageId_idx" ON "repair_schedule_projects"("packageId");
CREATE INDEX "repair_schedule_projects_contractId_idx" ON "repair_schedule_projects"("contractId");
CREATE INDEX "repair_schedule_projects_updatedAt_idx" ON "repair_schedule_projects"("updatedAt");
CREATE INDEX "repair_schedule_entries_projectId_date_idx" ON "repair_schedule_entries"("projectId", "date");
CREATE INDEX "repair_schedule_entries_date_idx" ON "repair_schedule_entries"("date");

-- AddForeignKey
ALTER TABLE "repair_schedule_projects" ADD CONSTRAINT "repair_schedule_projects_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "installer_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_schedule_projects" ADD CONSTRAINT "repair_schedule_projects_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_schedule_projects" ADD CONSTRAINT "repair_schedule_projects_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_schedule_projects" ADD CONSTRAINT "repair_schedule_projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_schedule_projects" ADD CONSTRAINT "repair_schedule_projects_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_schedule_entries" ADD CONSTRAINT "repair_schedule_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "repair_schedule_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_schedule_entries" ADD CONSTRAINT "repair_schedule_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
