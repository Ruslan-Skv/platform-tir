-- AlterTable
ALTER TABLE "salary_global_settings" ADD COLUMN     "cashQrBonusEnforced" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cashQrBonusPercent" DECIMAL(5, 2) NOT NULL DEFAULT 0.5;
