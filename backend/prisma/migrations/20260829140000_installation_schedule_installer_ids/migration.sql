-- AlterTable
ALTER TABLE "installation_schedule_entries" ADD COLUMN "installerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill from primary installerId
UPDATE "installation_schedule_entries"
SET "installerIds" = ARRAY["installerId"]
WHERE "installerId" IS NOT NULL AND ("installerIds" IS NULL OR cardinality("installerIds") = 0);
