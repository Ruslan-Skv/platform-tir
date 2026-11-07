/*
  Строки ведомости авансов без привязки к договору: packageId становится
  nullable, добавляется поле purpose («Назначение выдачи»).
*/
-- AlterTable
ALTER TABLE "installer_advance_sheet_items" ADD COLUMN "purpose" TEXT;

-- AlterTable
ALTER TABLE "installer_advance_sheet_items" ALTER COLUMN "packageId" DROP NOT NULL;
