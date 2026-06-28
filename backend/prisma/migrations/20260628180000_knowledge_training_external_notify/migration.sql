-- External notify + admin push settings for knowledge platform study progress
ALTER TABLE "external_notify_settings" ADD COLUMN "knowledgeTrainingNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "knowledgeTrainingNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "knowledgeTrainingNotifyMaxIds" JSONB;

ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnKnowledgeTraining" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnKnowledgeTraining" BOOLEAN NOT NULL DEFAULT true;
