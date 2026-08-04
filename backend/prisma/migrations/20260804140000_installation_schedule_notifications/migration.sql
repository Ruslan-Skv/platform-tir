-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN IF NOT EXISTS "notifyOnInstallationSchedules" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN IF NOT EXISTS "notifyOnInstallationSchedules" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "installationScheduleNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "installationScheduleNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "installationScheduleNotifyMaxIds" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "installation_schedule_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "installationScheduleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installation_schedule_bell_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "installation_schedule_bell_events_recipientId_createdAt_idx"
  ON "installation_schedule_bell_events"("recipientId", "createdAt");
CREATE INDEX IF NOT EXISTS "installation_schedule_bell_events_installationScheduleId_idx"
  ON "installation_schedule_bell_events"("installationScheduleId");

DO $$ BEGIN
  ALTER TABLE "installation_schedule_bell_events"
    ADD CONSTRAINT "installation_schedule_bell_events_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "installation_schedule_bell_events"
    ADD CONSTRAINT "installation_schedule_bell_events_installationScheduleId_fkey"
    FOREIGN KEY ("installationScheduleId") REFERENCES "installation_schedule_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
