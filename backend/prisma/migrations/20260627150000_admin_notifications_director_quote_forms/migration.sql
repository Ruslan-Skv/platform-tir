-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnDirectorForm" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnQuoteForm" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnDirectorForm" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnQuoteForm" BOOLEAN NOT NULL DEFAULT true;
