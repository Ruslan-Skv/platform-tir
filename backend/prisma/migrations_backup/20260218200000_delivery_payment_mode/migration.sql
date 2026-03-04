-- AlterTable
ALTER TABLE "delivery_config" ADD COLUMN IF NOT EXISTS "deliveryPaymentMode" TEXT DEFAULT 'WITH_ORDER';
