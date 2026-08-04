-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN IF NOT EXISTS "notifyOnRepairSchedules" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN IF NOT EXISTS "notifyOnRepairSchedules" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "repair_schedule_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "repairScheduleProjectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_schedule_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "repair_schedule_bell_events_recipientId_createdAt_idx" ON "repair_schedule_bell_events"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "repair_schedule_bell_events_repairScheduleProjectId_idx" ON "repair_schedule_bell_events"("repairScheduleProjectId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "repair_schedule_bell_events" ADD CONSTRAINT "repair_schedule_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "repair_schedule_bell_events" ADD CONSTRAINT "repair_schedule_bell_events_repairScheduleProjectId_fkey" FOREIGN KEY ("repairScheduleProjectId") REFERENCES "repair_schedule_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
