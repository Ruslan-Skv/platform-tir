-- AlterTable
ALTER TABLE "marketing_channels" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "marketing_channels" ADD COLUMN IF NOT EXISTS "monthlyBudget" DECIMAL(12,2);
ALTER TABLE "marketing_channels" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "marketing_channels" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "marketing_channels_priority_idx" ON "marketing_channels"("priority");

-- CreateTable
CREATE TABLE IF NOT EXISTS "marketing_strategies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Рекламная стратегия',
    "summary" TEXT,
    "goals" TEXT,
    "notes" TEXT,
    "monthlyBudgetNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_strategies_pkey" PRIMARY KEY ("id")
);
