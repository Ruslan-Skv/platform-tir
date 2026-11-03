-- Персональный порядок разделов админ-сайдбара:
-- JSON-массив href верхнего уровня; NULL — порядок по умолчанию.

ALTER TABLE "users" ADD COLUMN "adminSidebarNavOrder" TEXT;
