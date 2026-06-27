-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnQuizMebel" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnQuizRemont" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnQuizMebel" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnQuizRemont" BOOLEAN NOT NULL DEFAULT true;
