-- CreateTable
CREATE TABLE "component_catalog_kinds" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kitQuantity" DOUBLE PRECISION,
    "quantityStep" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_catalog_kinds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "component_catalog_kinds_code_key" ON "component_catalog_kinds"("code");
CREATE UNIQUE INDEX "component_catalog_kinds_slug_key" ON "component_catalog_kinds"("slug");

-- Seed kinds from legacy enum + settings
INSERT INTO "component_catalog_kinds" ("id", "code", "name", "slug", "kitQuantity", "quantityStep", "sortOrder", "updatedAt")
SELECT
    'cmkind' || LOWER(s.kind::text),
    s.kind::text,
    CASE s.kind::text
        WHEN 'STOIKA_KOROBKI' THEN 'Стойка коробки'
        WHEN 'NALICHNIK' THEN 'Наличник'
        WHEN 'DOBOR' THEN 'Добор'
        WHEN 'PRITVORNAYA_PLANKA' THEN 'Притворная планка'
        WHEN 'KOROBKA' THEN 'Коробка'
        ELSE 'Прочее'
    END,
    LOWER(REPLACE(s.kind::text, '_', '-')),
    s."kitQuantity",
    s."quantityStep",
    CASE s.kind::text
        WHEN 'STOIKA_KOROBKI' THEN 0
        WHEN 'NALICHNIK' THEN 1
        WHEN 'DOBOR' THEN 2
        WHEN 'PRITVORNAYA_PLANKA' THEN 3
        WHEN 'KOROBKA' THEN 4
        ELSE 5
    END,
    CURRENT_TIMESTAMP
FROM "component_catalog_kind_settings" s;

-- AlterTable
ALTER TABLE "component_catalog_items" ADD COLUMN "kindId" TEXT;

UPDATE "component_catalog_items" ci
SET "kindId" = ck.id
FROM "component_catalog_kinds" ck
WHERE ck.code = ci.kind::text;

UPDATE "component_catalog_items"
SET "kindId" = (SELECT id FROM "component_catalog_kinds" WHERE code = 'OTHER' LIMIT 1)
WHERE "kindId" IS NULL;

ALTER TABLE "component_catalog_items" ALTER COLUMN "kindId" SET NOT NULL;

CREATE INDEX "component_catalog_items_kindId_idx" ON "component_catalog_items"("kindId");

ALTER TABLE "component_catalog_items" ADD CONSTRAINT "component_catalog_items_kindId_fkey"
    FOREIGN KEY ("kindId") REFERENCES "component_catalog_kinds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "component_catalog_items" DROP COLUMN "kind";

DROP TABLE "component_catalog_kind_settings";

DROP TYPE "ComponentKind";
