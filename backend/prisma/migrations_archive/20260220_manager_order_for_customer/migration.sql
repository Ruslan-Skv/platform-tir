-- AlterTable: add isGuest to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add manager order fields to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "createdByManagerId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "sentToEmailAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "orderViewToken" TEXT;

-- CreateIndex: unique orderViewToken
CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderViewToken_key" ON "orders"("orderViewToken");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdByManagerId_fkey"
  FOREIGN KEY ("createdByManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
