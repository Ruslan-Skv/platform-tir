-- Разделение уведомлений о замерах: «Новый замер» (создание) отдельно
-- от остальных событий (выполнен, отказ, договор).
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnMeasurementCreated" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnMeasurementCreated" BOOLEAN NOT NULL DEFAULT true;

-- Сохраняем текущее поведение: раньше один флаг закрывал все события замеров.
UPDATE "admin_notifications_block" SET "notifyOnMeasurementCreated" = "notifyOnMeasurements";
UPDATE "user_admin_notification_override" SET "notifyOnMeasurementCreated" = "notifyOnMeasurements";

-- Отдельные внешние каналы (email, Telegram, MAX) для события «Новый замер».
ALTER TABLE "external_notify_settings" ADD COLUMN "measurementCreatedNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "measurementCreatedNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "measurementCreatedNotifyMaxIds" JSONB;

UPDATE "external_notify_settings"
SET "measurementCreatedNotifyEmails" = "measurementNotifyEmails",
    "measurementCreatedNotifyTelegramIds" = "measurementNotifyTelegramIds",
    "measurementCreatedNotifyMaxIds" = "measurementNotifyMaxIds";
