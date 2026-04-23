-- Прозрачная заливка карточки категории на публичной странице «Ремонт квартир»
ALTER TABLE "service_catalog_categories" ADD COLUMN IF NOT EXISTS "cardBackgroundTransparent" BOOLEAN NOT NULL DEFAULT false;
