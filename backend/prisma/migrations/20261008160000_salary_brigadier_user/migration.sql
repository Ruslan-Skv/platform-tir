-- Фиксация бригадира: пользователю из этой привязки начисляется бригадирский
-- фонд (бригадир может совмещать роль замерщика — тогда з/п складывается).
ALTER TABLE "salary_global_settings" ADD COLUMN "brigadierUserId" TEXT;
ALTER TABLE "salary_global_settings"
  ADD CONSTRAINT "salary_global_settings_brigadierUserId_fkey"
  FOREIGN KEY ("brigadierUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
