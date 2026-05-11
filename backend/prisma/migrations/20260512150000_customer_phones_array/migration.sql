-- Дополнительные телефоны заказчика в CRM (массив); поле phone — основной (первый) для совместимости.
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "customers"
SET "phones" = ARRAY["phone"::TEXT]
WHERE "phone" IS NOT NULL AND TRIM(BOTH FROM "phone") <> '';
