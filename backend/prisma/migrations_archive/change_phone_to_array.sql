-- Migration: Change phone field from single string to array of strings
-- Allows multiple phone numbers per supplier

-- Step 1: Add new column for phone array
ALTER TABLE "suppliers" 
ADD COLUMN IF NOT EXISTS "phone_new" TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing phone data to array
UPDATE "suppliers" 
SET "phone_new" = ARRAY["phone"]::TEXT[]
WHERE "phone" IS NOT NULL AND "phone" != '';

-- Step 3: Drop old phone column
ALTER TABLE "suppliers" 
DROP COLUMN IF EXISTS "phone";

-- Step 4: Rename new column to phone
ALTER TABLE "suppliers" 
RENAME COLUMN "phone_new" TO "phone";
