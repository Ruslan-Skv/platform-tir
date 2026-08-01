-- AlterTable
ALTER TABLE "driver_delivery_availability" ADD COLUMN "absenceBlocks" JSONB NOT NULL DEFAULT '[]';
