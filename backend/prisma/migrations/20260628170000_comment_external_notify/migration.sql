-- External notify channels for user comments (email, Telegram, MAX)
ALTER TABLE "external_notify_settings" ADD COLUMN "commentNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "commentNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "commentNotifyMaxIds" JSONB;
