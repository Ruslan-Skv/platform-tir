-- External notify channels for support chat (email, Telegram, MAX)
ALTER TABLE "external_notify_settings" ADD COLUMN "supportNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "supportNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "supportNotifyMaxIds" JSONB;
