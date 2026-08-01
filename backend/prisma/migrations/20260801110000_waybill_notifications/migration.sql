-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN IF NOT EXISTS "notifyOnWaybills" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN IF NOT EXISTS "notifyOnWaybills" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "waybillNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "waybillNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "waybillNotifyMaxIds" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "waybill_task_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "waybillTaskId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waybill_task_bell_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "waybill_task_bell_events_recipientId_createdAt_idx" ON "waybill_task_bell_events"("recipientId", "createdAt");
CREATE INDEX IF NOT EXISTS "waybill_task_bell_events_waybillTaskId_idx" ON "waybill_task_bell_events"("waybillTaskId");

DO $$ BEGIN
  ALTER TABLE "waybill_task_bell_events"
    ADD CONSTRAINT "waybill_task_bell_events_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "waybill_task_bell_events"
    ADD CONSTRAINT "waybill_task_bell_events_waybillTaskId_fkey"
    FOREIGN KEY ("waybillTaskId") REFERENCES "waybill_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
