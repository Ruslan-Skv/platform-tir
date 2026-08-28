-- AlterTable
ALTER TABLE "admin_dashboard_block" ADD COLUMN "calendarVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "admin_dashboard_block" ADD COLUMN "sectionOrder" JSONB;
