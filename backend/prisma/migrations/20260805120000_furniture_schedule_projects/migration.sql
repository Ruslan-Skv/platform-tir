-- CreateEnum
CREATE TYPE "FurnitureScheduleProjectStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLAIMS', 'CLOSED');

-- CreateEnum
CREATE TYPE "FurnitureScheduleEntryKind" AS ENUM ('WEEKLY', 'MILESTONE', 'NOTE');

-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN IF NOT EXISTS "notifyOnFurnitureSchedules" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN IF NOT EXISTS "notifyOnFurnitureSchedules" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "furniture_schedule_projects" (
    "id" TEXT NOT NULL,
    "status" "FurnitureScheduleProjectStatus" NOT NULL DEFAULT 'NEW',
    "contractNumber" TEXT,
    "installationContractNumber" TEXT,
    "appliancesContractNumber" TEXT,
    "repairInfo" TEXT,
    "reviewInfo" TEXT,
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
    "contractDate" DATE,
    "kzInfo" TEXT,
    "pauseStartDate" DATE,
    "pauseResumeDate" DATE,
    "workPeriodDays" INTEGER,
    "workStartActDate" DATE,
    "workCloseActDate" DATE,
    "plannedStartDate" DATE,
    "closedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "furniture_schedule_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furniture_schedule_entries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "FurnitureScheduleEntryKind" NOT NULL DEFAULT 'WEEKLY',
    "text" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "furniture_schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furniture_schedule_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "furnitureScheduleProjectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "furniture_schedule_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "furniture_schedule_projects_status_idx" ON "furniture_schedule_projects"("status");
CREATE INDEX "furniture_schedule_projects_installerId_idx" ON "furniture_schedule_projects"("installerId");
CREATE INDEX "furniture_schedule_projects_packageId_idx" ON "furniture_schedule_projects"("packageId");
CREATE INDEX "furniture_schedule_projects_contractId_idx" ON "furniture_schedule_projects"("contractId");
CREATE INDEX "furniture_schedule_projects_updatedAt_idx" ON "furniture_schedule_projects"("updatedAt");
CREATE INDEX "furniture_schedule_entries_projectId_date_idx" ON "furniture_schedule_entries"("projectId", "date");
CREATE INDEX "furniture_schedule_entries_date_idx" ON "furniture_schedule_entries"("date");
CREATE INDEX "furniture_schedule_bell_events_recipientId_createdAt_idx" ON "furniture_schedule_bell_events"("recipientId", "createdAt");
CREATE INDEX "furniture_schedule_bell_events_furnitureScheduleProjectId_idx" ON "furniture_schedule_bell_events"("furnitureScheduleProjectId");

-- AddForeignKey
ALTER TABLE "furniture_schedule_projects" ADD CONSTRAINT "furniture_schedule_projects_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "installer_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "furniture_schedule_projects" ADD CONSTRAINT "furniture_schedule_projects_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "furniture_schedule_projects" ADD CONSTRAINT "furniture_schedule_projects_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "furniture_schedule_projects" ADD CONSTRAINT "furniture_schedule_projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "furniture_schedule_projects" ADD CONSTRAINT "furniture_schedule_projects_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "furniture_schedule_entries" ADD CONSTRAINT "furniture_schedule_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "furniture_schedule_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "furniture_schedule_entries" ADD CONSTRAINT "furniture_schedule_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "furniture_schedule_bell_events" ADD CONSTRAINT "furniture_schedule_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "furniture_schedule_bell_events" ADD CONSTRAINT "furniture_schedule_bell_events_furnitureScheduleProjectId_fkey" FOREIGN KEY ("furnitureScheduleProjectId") REFERENCES "furniture_schedule_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
