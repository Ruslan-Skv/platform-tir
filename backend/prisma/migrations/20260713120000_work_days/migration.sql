-- CreateEnum
CREATE TYPE "WorkDayStatus" AS ENUM ('OPEN', 'CLOSED', 'AUTO_CLOSED');

-- CreateEnum
CREATE TYPE "WorkDayCloseReason" AS ENUM ('MANUAL', 'AUTO_AT_DEADLINE', 'REPORTED_NEXT_DAY');

-- AlterTable offices
ALTER TABLE "offices" ADD COLUMN "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "offices" ADD COLUMN "workDayStartTime" TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE "offices" ADD COLUMN "workDayEndTime" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "offices" ADD COLUMN "workDaysOfWeek" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5];
ALTER TABLE "offices" ADD COLUMN "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 10;

-- AlterTable users
ALTER TABLE "users" ADD COLUMN "officeId" TEXT;
ALTER TABLE "users" ADD COLUMN "useCustomWorkSchedule" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "workDayStartTime" TEXT;
ALTER TABLE "users" ADD COLUMN "workDayEndTime" TEXT;
ALTER TABLE "users" ADD COLUMN "workDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "users" ADD COLUMN "gracePeriodMinutes" INTEGER;

CREATE INDEX "users_officeId_idx" ON "users"("officeId");

ALTER TABLE "users" ADD CONSTRAINT "users_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable work_day_settings
CREATE TABLE "work_day_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trackedRoles" "UserRole"[] DEFAULT ARRAY['MANAGER']::"UserRole"[],
    "blockAdminWithoutWorkDay" BOOLEAN NOT NULL DEFAULT true,
    "requireOfficeIp" BOOLEAN NOT NULL DEFAULT true,
    "blockMobileDevices" BOOLEAN NOT NULL DEFAULT true,
    "autoCloseHour" INTEGER NOT NULL DEFAULT 22,
    "autoCloseMinute" INTEGER NOT NULL DEFAULT 0,
    "defaultGracePeriodMinutes" INTEGER NOT NULL DEFAULT 10,
    "greetingMessages" TEXT[] DEFAULT ARRAY['Доброго дня! Желаем продуктивной работы.', 'С добрым утром! Отличного рабочего дня!', 'Хорошего дня и отличной работы!']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_day_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "work_day_settings" ("id", "updatedAt") VALUES ('main', CURRENT_TIMESTAMP);

-- CreateTable work_days
CREATE TABLE "work_days" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "officeId" TEXT,
    "workDate" DATE NOT NULL,
    "status" "WorkDayStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "closeReason" "WorkDayCloseReason",
    "autoClosedAt" TIMESTAMP(3),
    "startedFromIp" TEXT,
    "startedFromUserAgent" TEXT,
    "endedFromIp" TEXT,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "reportedEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable work_day_absences
CREATE TABLE "work_day_absences" (
    "id" TEXT NOT NULL,
    "workDayId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "reason" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_day_absences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_days_userId_workDate_key" ON "work_days"("userId", "workDate");
CREATE INDEX "work_days_userId_idx" ON "work_days"("userId");
CREATE INDEX "work_days_officeId_idx" ON "work_days"("officeId");
CREATE INDEX "work_days_workDate_idx" ON "work_days"("workDate");
CREATE INDEX "work_days_status_idx" ON "work_days"("status");
CREATE INDEX "work_day_absences_workDayId_idx" ON "work_day_absences"("workDayId");

ALTER TABLE "work_days" ADD CONSTRAINT "work_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_days" ADD CONSTRAINT "work_days_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_day_absences" ADD CONSTRAINT "work_day_absences_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "work_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
