-- Внешние каналы уведомлений (email/Telegram/MAX) для события изменения статусов замеров
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "measurementNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "measurementNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN IF NOT EXISTS "measurementNotifyMaxIds" JSONB;
