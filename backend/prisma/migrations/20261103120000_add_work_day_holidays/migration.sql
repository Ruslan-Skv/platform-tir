-- Нерабочие праздничные дни (или периоды), объявленные суперадмином:
-- день считается выходным для всех сотрудников — прогул не фиксируется,
-- выход на работу помечается как «Работа в выходной».

-- CreateTable
CREATE TABLE "work_day_holidays" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_day_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_day_holidays_dateFrom_idx" ON "work_day_holidays"("dateFrom");
CREATE INDEX "work_day_holidays_dateTo_idx" ON "work_day_holidays"("dateTo");

-- AddForeignKey
ALTER TABLE "work_day_holidays" ADD CONSTRAINT "work_day_holidays_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
