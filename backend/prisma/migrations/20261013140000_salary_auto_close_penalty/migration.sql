-- AlterTable
ALTER TABLE "salary_global_settings" ADD COLUMN     "autoCloseEnforced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoClosePenaltyRub" DECIMAL(12, 2) NOT NULL DEFAULT 50;
