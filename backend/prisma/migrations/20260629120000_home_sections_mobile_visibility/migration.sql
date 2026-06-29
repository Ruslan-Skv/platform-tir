-- AlterTable
ALTER TABLE "home_page_sections_block" ADD COLUMN "heroMobileVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "home_page_sections_block" ADD COLUMN "directionsMobileVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "home_page_sections_block" ADD COLUMN "advantagesMobileVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "home_page_sections_block" ADD COLUMN "servicesMobileVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "home_page_sections_block" ADD COLUMN "featuredProductsMobileVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "home_page_sections_block" ADD COLUMN "contactFormMobileVisible" BOOLEAN NOT NULL DEFAULT true;

-- Синхронизируем с уже сохранённой десктопной видимостью
UPDATE "home_page_sections_block"
SET
  "heroMobileVisible" = "heroVisible",
  "directionsMobileVisible" = "directionsVisible",
  "advantagesMobileVisible" = "advantagesVisible",
  "servicesMobileVisible" = "servicesVisible",
  "featuredProductsMobileVisible" = "featuredProductsVisible",
  "contactFormMobileVisible" = "contactFormVisible";
