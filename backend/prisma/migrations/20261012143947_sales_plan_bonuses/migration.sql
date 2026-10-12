-- AlterTable
ALTER TABLE "salary_global_settings" ADD COLUMN     "salesPlanPercent1" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesPlanPercent2" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesPlanPercent3" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesPlanThreshold1" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesPlanThreshold2" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesPlanThreshold3" DECIMAL(12,2) NOT NULL DEFAULT 0;
