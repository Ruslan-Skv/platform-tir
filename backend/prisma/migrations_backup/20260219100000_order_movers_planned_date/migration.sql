-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "moversCount" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "plannedDeliveryDate" DATE;
