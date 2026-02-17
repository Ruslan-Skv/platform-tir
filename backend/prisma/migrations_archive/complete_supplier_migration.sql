-- Complete migration: Add supplier fields and remove code, make INN unique
-- This migration combines both changes

-- Step 1: Make name optional (for backward compatibility)
ALTER TABLE "suppliers" 
ALTER COLUMN "name" DROP NOT NULL;

-- Step 2: Add new required field: legal name (first as nullable)
ALTER TABLE "suppliers" 
ADD COLUMN IF NOT EXISTS "legalName" TEXT;

-- Step 3: Add optional fields
ALTER TABLE "suppliers" 
ADD COLUMN IF NOT EXISTS "commercialName" TEXT,
ADD COLUMN IF NOT EXISTS "legalAddress" TEXT,
ADD COLUMN IF NOT EXISTS "inn" TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS "bankAccount" TEXT,
ADD COLUMN IF NOT EXISTS "bankBik" TEXT;

-- Step 4: Update existing records: set legalName from name if name exists
-- Note: code column may already be removed, so we only use name
UPDATE "suppliers" 
SET "legalName" = COALESCE("name", 'Поставщик ' || id::text)
WHERE "legalName" IS NULL;

-- Step 5: Make legalName NOT NULL after all records have been updated
ALTER TABLE "suppliers" 
ALTER COLUMN "legalName" SET NOT NULL;

-- Step 6: Remove code column if it still exists
ALTER TABLE "suppliers" 
DROP COLUMN IF EXISTS "code";

-- Step 7: Add unique constraint to INN (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_inn_unique" ON "suppliers" ("inn") WHERE "inn" IS NOT NULL;
