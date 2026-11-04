-- Запрос отпуска: сотрудник отправляет период, суперадмин подтверждает,
-- после подтверждения дни периода отмечаются отпуском (work_day_leaves, тип VACATION).

ALTER TYPE "WorkDayRequestType" ADD VALUE 'VACATION_LEAVE';
