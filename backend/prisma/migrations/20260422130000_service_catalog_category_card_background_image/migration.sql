-- Фон карточки корневой категории на публичной странице каталога услуг
ALTER TABLE "service_catalog_categories" ADD COLUMN IF NOT EXISTS "cardBackgroundImage" TEXT;
