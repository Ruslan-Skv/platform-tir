-- Отпуска и больничные сотрудников (отмечает суперадмин, в том числе задним числом)

-- CreateEnum
CREATE TYPE "WorkDayLeaveType" AS ENUM ('VACATION', 'SICK');

-- CreateTable
CREATE TABLE "work_day_leaves" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WorkDayLeaveType" NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_day_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_day_leaves_userId_idx" ON "work_day_leaves"("userId");
CREATE INDEX "work_day_leaves_dateFrom_idx" ON "work_day_leaves"("dateFrom");
CREATE INDEX "work_day_leaves_dateTo_idx" ON "work_day_leaves"("dateTo");

-- AddForeignKey
ALTER TABLE "work_day_leaves" ADD CONSTRAINT "work_day_leaves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_day_leaves" ADD CONSTRAINT "work_day_leaves_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
