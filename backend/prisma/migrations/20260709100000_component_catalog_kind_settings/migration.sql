-- CreateTable
CREATE TABLE "component_catalog_kind_settings" (
    "kind" "ComponentKind" NOT NULL,
    "kitQuantity" DOUBLE PRECISION,
    "quantityStep" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_catalog_kind_settings_pkey" PRIMARY KEY ("kind")
);

-- Seed defaults per kind
INSERT INTO "component_catalog_kind_settings" ("kind", "kitQuantity", "quantityStep", "updatedAt")
VALUES
    ('STOIKA_KOROBKI', 2.5, 0.5, CURRENT_TIMESTAMP),
    ('NALICHNIK', 5, 1, CURRENT_TIMESTAMP),
    ('DOBOR', NULL, 1, CURRENT_TIMESTAMP),
    ('PRITVORNAYA_PLANKA', NULL, 1, CURRENT_TIMESTAMP),
    ('KOROBKA', NULL, 1, CURRENT_TIMESTAMP),
    ('OTHER', NULL, 1, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "component_catalog_items" DROP COLUMN "kitQuantity",
DROP COLUMN "quantityStep";
