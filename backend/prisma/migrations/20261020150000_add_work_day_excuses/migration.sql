-- Учёт рабочего времени: прощённые суперадмином нарушения режима
-- (опоздание / ранний уход / автозакрытие / прогул) за конкретную дату сотрудника.
-- Факт нарушения сохраняется, но удержание из оклада не начисляется,
-- а в «Моём рабочем дне» сотрудника нарушение не отображается.

-- CreateEnum
CREATE TYPE "WorkDayExcuseKind" AS ENUM ('LATE', 'EARLY_LEAVE', 'AUTO_CLOSE', 'TRUANCY');

-- CreateTable
CREATE TABLE "work_day_excuses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "kind" "WorkDayExcuseKind" NOT NULL,
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_day_excuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_day_excuses_userId_workDate_kind_key" ON "work_day_excuses"("userId", "workDate", "kind");
CREATE INDEX "work_day_excuses_userId_idx" ON "work_day_excuses"("userId");
CREATE INDEX "work_day_excuses_workDate_idx" ON "work_day_excuses"("workDate");

-- AddForeignKey
ALTER TABLE "work_day_excuses" ADD CONSTRAINT "work_day_excuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_day_excuses" ADD CONSTRAINT "work_day_excuses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
