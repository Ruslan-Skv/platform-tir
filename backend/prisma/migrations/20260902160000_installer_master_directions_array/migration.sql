-- Один мастер может работать по нескольким направлениям.
ALTER TABLE "installer_masters" ADD COLUMN IF NOT EXISTS "directions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "installer_masters"
SET "directions" = ARRAY["direction"]
WHERE COALESCE(array_length("directions", 1), 0) = 0
  AND "direction" IS NOT NULL
  AND TRIM("direction") <> '';

DROP INDEX IF EXISTS "installer_masters_direction_idx";
ALTER TABLE "installer_masters" DROP COLUMN IF EXISTS "direction";
