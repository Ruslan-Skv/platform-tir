-- AlterTable
ALTER TABLE "repair_schedule_projects" ADD COLUMN "workPeriodDays" INTEGER,
ADD COLUMN "workStartActDate" DATE,
ADD COLUMN "workCloseActDate" DATE;
