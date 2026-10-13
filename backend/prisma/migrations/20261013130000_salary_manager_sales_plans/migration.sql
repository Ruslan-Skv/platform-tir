-- CreateTable
CREATE TABLE "salary_manager_sales_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threshold1" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "threshold2" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "threshold3" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "percent1" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "percent2" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "percent3" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_manager_sales_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salary_manager_sales_plans_userId_key" ON "salary_manager_sales_plans"("userId");

-- AddForeignKey
ALTER TABLE "salary_manager_sales_plans" ADD CONSTRAINT "salary_manager_sales_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- Глобальные пороги плана продаж заменены индивидуальными планами менеджеров.
ALTER TABLE "salary_global_settings" DROP COLUMN "salesPlanThreshold1",
DROP COLUMN "salesPlanThreshold2",
DROP COLUMN "salesPlanThreshold3",
DROP COLUMN "salesPlanPercent1",
DROP COLUMN "salesPlanPercent2",
DROP COLUMN "salesPlanPercent3";
