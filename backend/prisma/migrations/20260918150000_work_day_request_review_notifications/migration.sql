-- Чек-бокс «Ответы на запросы рабочего времени» в настройках уведомлений

ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnWorkDayRequestReviews" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnWorkDayRequestReviews" BOOLEAN NOT NULL DEFAULT true;
