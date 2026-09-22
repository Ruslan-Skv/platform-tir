-- Доступность блока «Продажи за текущий месяц» по админ-ролям
ALTER TABLE "admin_dashboard_role_block" ADD COLUMN "salesMonthAllowed" BOOLEAN NOT NULL DEFAULT true;
