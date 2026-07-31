-- AlterTable
ALTER TABLE "waybill_tasks" ADD COLUMN IF NOT EXISTS "customerPhones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from primary phone
UPDATE "waybill_tasks"
SET "customerPhones" = ARRAY["customerPhone"]
WHERE "customerPhone" IS NOT NULL
  AND TRIM("customerPhone") <> ''
  AND (cardinality("customerPhones") = 0 OR "customerPhones" IS NULL);
