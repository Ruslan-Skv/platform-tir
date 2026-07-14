-- Default on for existing catalog parents (subcategory filters); can be turned off in admin.
ALTER TABLE "categories" ALTER COLUMN "showChildCategoryFilters" SET DEFAULT true;
UPDATE "categories" SET "showChildCategoryFilters" = true;
