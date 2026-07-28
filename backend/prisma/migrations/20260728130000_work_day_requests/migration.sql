-- CreateEnum
CREATE TYPE "WorkDayRequestType" AS ENUM ('DAY_OFF', 'EARLY_LEAVE');

-- CreateEnum
CREATE TYPE "WorkDayRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "work_day_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WorkDayRequestType" NOT NULL,
    "status" "WorkDayRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestDate" DATE NOT NULL,
    "proposedEndTime" TEXT,
    "comment" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_day_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_day_requests_userId_idx" ON "work_day_requests"("userId");

-- CreateIndex
CREATE INDEX "work_day_requests_status_idx" ON "work_day_requests"("status");

-- CreateIndex
CREATE INDEX "work_day_requests_requestDate_idx" ON "work_day_requests"("requestDate");

-- CreateIndex
CREATE INDEX "work_day_requests_type_status_requestDate_idx" ON "work_day_requests"("type", "status", "requestDate");

-- AddForeignKey
ALTER TABLE "work_day_requests" ADD CONSTRAINT "work_day_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_day_requests" ADD CONSTRAINT "work_day_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
