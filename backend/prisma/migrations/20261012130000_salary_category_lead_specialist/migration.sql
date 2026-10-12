-- Привязка ведущего специалиста к направлению: пользователю из этой привязки
-- начисляется з/п ВС (фонд ведущих специалистов) по данному направлению.
ALTER TABLE "salary_categories" ADD COLUMN "leadSpecialistUserId" TEXT;
ALTER TABLE "salary_categories"
  ADD CONSTRAINT "salary_categories_leadSpecialistUserId_fkey"
  FOREIGN KEY ("leadSpecialistUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
