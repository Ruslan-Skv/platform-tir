-- AlterTable users
ALTER TABLE "users" ADD COLUMN "workDayTrackingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "workDayWeeklySchedule" JSONB;

-- AlterTable offices
ALTER TABLE "offices" ADD COLUMN "workDayWeeklySchedule" JSONB;

-- Заполнить недельный график офисов из существующих полей
UPDATE "offices" SET "workDayWeeklySchedule" = jsonb_build_object(
  '1', jsonb_build_object('enabled', 1 = ANY("workDaysOfWeek"), 'startTime', "workDayStartTime", 'endTime', "workDayEndTime", 'gracePeriodMinutes', "gracePeriodMinutes"),
  '2', jsonb_build_object('enabled', 2 = ANY("workDaysOfWeek"), 'startTime', "workDayStartTime", 'endTime', "workDayEndTime", 'gracePeriodMinutes', "gracePeriodMinutes"),
  '3', jsonb_build_object('enabled', 3 = ANY("workDaysOfWeek"), 'startTime', "workDayStartTime", 'endTime', "workDayEndTime", 'gracePeriodMinutes', "gracePeriodMinutes"),
  '4', jsonb_build_object('enabled', 4 = ANY("workDaysOfWeek"), 'startTime', "workDayStartTime", 'endTime', "workDayEndTime", 'gracePeriodMinutes', "gracePeriodMinutes"),
  '5', jsonb_build_object('enabled', 5 = ANY("workDaysOfWeek"), 'startTime', "workDayStartTime", 'endTime', "workDayEndTime", 'gracePeriodMinutes', "gracePeriodMinutes"),
  '6', jsonb_build_object('enabled', 6 = ANY("workDaysOfWeek"), 'startTime', "workDayStartTime", 'endTime', "workDayEndTime", 'gracePeriodMinutes', "gracePeriodMinutes"),
  '7', jsonb_build_object('enabled', 7 = ANY("workDaysOfWeek"), 'startTime', "workDayStartTime", 'endTime', "workDayEndTime", 'gracePeriodMinutes', "gracePeriodMinutes")
);

-- Обновить приветствия: плейсхолдер {имя}
UPDATE "work_day_settings" SET "greetingMessages" = ARRAY[
  'Доброго дня, {имя}! Желаем продуктивной работы.',
  'С добрым утром, {имя}! Отличного рабочего дня!',
  '{имя}, желаем хорошего дня и отличной работы!'
];
