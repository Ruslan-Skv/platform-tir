-- Add customer name and processing manager to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerFirstName" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerLastName" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "processedByManagerId" TEXT;

-- Add foreign key for processedByManagerId
ALTER TABLE "orders" ADD CONSTRAINT "orders_processedByManagerId_fkey"
  FOREIGN KEY ("processedByManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
