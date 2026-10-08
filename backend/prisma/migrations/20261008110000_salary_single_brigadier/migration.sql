-- Бригадирский фонд больше не делится между двумя бригадирами:
-- ставки бригадиров и коэффициент дележа не нужны.
ALTER TABLE "salary_global_settings" DROP COLUMN "brigadier1Percent";
ALTER TABLE "salary_global_settings" DROP COLUMN "brigadier2Percent";
ALTER TABLE "salary_global_settings" DROP COLUMN "brigadeSplitCoeff";
