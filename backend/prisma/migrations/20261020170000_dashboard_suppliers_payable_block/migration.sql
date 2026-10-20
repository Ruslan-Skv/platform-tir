-- Дашборд: блок «Расчёты с поставщиками» — доступность по ролям
-- (настраивается супер-админом в «Настройках дашборда»).

ALTER TABLE "admin_dashboard_role_block" ADD COLUMN "suppliersPayableAllowed" BOOLEAN NOT NULL DEFAULT true;
