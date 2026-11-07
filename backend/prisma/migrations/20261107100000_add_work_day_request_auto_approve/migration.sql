-- Типы запросов рабочего дня, удовлетворяемые автоматически при отправке.
ALTER TABLE "work_day_settings" ADD COLUMN "autoApprovedRequestTypes" "WorkDayRequestType"[] NOT NULL DEFAULT ARRAY[]::"WorkDayRequestType"[];
