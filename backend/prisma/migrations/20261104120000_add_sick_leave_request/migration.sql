-- Запрос больничного: сотрудник отправляет период, суперадмин подтверждает,
-- после подтверждения дни периода отмечаются больничным (work_day_leaves, тип SICK).

ALTER TYPE "WorkDayRequestType" ADD VALUE 'SICK_LEAVE';

-- AlterTable
ALTER TABLE "work_day_requests" ADD COLUMN "requestDateTo" DATE;
