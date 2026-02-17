-- Migration: Add supplier information fields
-- Adds legal name, commercial name, legal address, INN, and bank details to suppliers table

-- Make name optional (for backward compatibility)
ALTER TABLE "suppliers" 
ALTER COLUMN "name" DROP NOT NULL;

-- Add new required field: legal name (first as nullable)
ALTER TABLE "suppliers" 
ADD COLUMN IF NOT EXISTS "legalName" TEXT;

-- Add optional fields
ALTER TABLE "suppliers" 
ADD COLUMN IF NOT EXISTS "commercialName" TEXT,
ADD COLUMN IF NOT EXISTS "legalAddress" TEXT,
ADD COLUMN IF NOT EXISTS "inn" TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS "bankAccount" TEXT,
ADD COLUMN IF NOT EXISTS "bankBik" TEXT;

-- Update existing records: set legalName from name if name exists, otherwise use code
UPDATE "suppliers" 
SET "legalName" = COALESCE("name", "code")
WHERE "legalName" IS NULL;

-- Now make legalName NOT NULL after all records have been updated
ALTER TABLE "suppliers" 
ALTER COLUMN "legalName" SET NOT NULL;
