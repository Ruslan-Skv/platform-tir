-- Внешние каналы (email/Telegram/MAX) для запросов удалённой помощи

ALTER TABLE "external_notify_settings" ADD COLUMN "remoteHelpNotifyEmails" JSONB,
ADD COLUMN "remoteHelpNotifyTelegramIds" JSONB,
ADD COLUMN "remoteHelpNotifyMaxIds" JSONB;
