-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "adminEditedAt" TIMESTAMP(3);
