-- External notify channels for new product reviews (email, Telegram, MAX)
ALTER TABLE "external_notify_settings" ADD COLUMN "reviewNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "reviewNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "reviewNotifyMaxIds" JSONB;
