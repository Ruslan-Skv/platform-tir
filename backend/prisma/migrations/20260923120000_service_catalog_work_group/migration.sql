-- Группа работ (демонтаж/черновые/чистовые) — альтернативная группировка видов работ для расчётов
-- CreateEnum
CREATE TYPE "ServiceCatalogWorkGroup" AS ENUM ('DEMOLITION', 'ROUGH', 'FINISHING');

-- AlterTable
ALTER TABLE "service_catalog_items" ADD COLUMN     "workGroup" "ServiceCatalogWorkGroup";
