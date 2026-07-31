-- AlterTable
ALTER TABLE "waybill_tasks" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "waybill_tasks" ADD COLUMN IF NOT EXISTS "customerAddress" TEXT;
ALTER TABLE "waybill_tasks" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
