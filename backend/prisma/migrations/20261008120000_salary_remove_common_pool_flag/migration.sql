-- Общий пул «общих» договоров теперь всегда включается в бригадирский фонд — флаг не нужен.
ALTER TABLE "salary_global_settings" DROP COLUMN "commonPoolToBrigadier";
