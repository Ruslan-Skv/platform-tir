-- Вариант шапки публичного сайта: classic | sticky
ALTER TABLE "site_public_config" ADD COLUMN "headerVariant" TEXT NOT NULL DEFAULT 'classic';
