-- Migration: Remove code field and make INN unique
-- Removes the code field from suppliers table and adds unique constraint to INN

-- Remove unique constraint from code (if exists)
-- Note: We'll drop the column, so constraint will be removed automatically

-- Drop code column
ALTER TABLE "suppliers" 
DROP COLUMN IF EXISTS "code";

-- Add unique constraint to INN (only for non-null values)
-- First, create a unique index on INN where it's not null
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_inn_unique" ON "suppliers" ("inn") WHERE "inn" IS NOT NULL;
