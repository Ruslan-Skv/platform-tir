-- Уведомления руководству по учёту рабочего времени

ALTER TABLE "work_days" ADD COLUMN "notifiedLateAt" TIMESTAMP(3);
ALTER TABLE "work_days" ADD COLUMN "notifiedEarlyLeaveAt" TIMESTAMP(3);
ALTER TABLE "work_days" ADD COLUMN "notifiedAutoClosedAt" TIMESTAMP(3);
ALTER TABLE "work_days" ADD COLUMN "notifiedReportedCloseAt" TIMESTAMP(3);

ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnWorkDays" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnWorkDays" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "external_notify_settings" ADD COLUMN "workDayNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "workDayNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "workDayNotifyMaxIds" JSONB;
