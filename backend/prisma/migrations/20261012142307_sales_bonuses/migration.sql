-- AlterTable
ALTER TABLE "salary_global_settings" ADD COLUMN     "salesBonusFirstPlace" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesBonusMinSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesBonusSecondPlace" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesBonusThirdPlace" DECIMAL(12,2) NOT NULL DEFAULT 0;
