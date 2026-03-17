-- AlterTable
ALTER TABLE "quote_form_block" ADD COLUMN "serviceTypeOptions" JSONB;

-- Set default options for existing block
UPDATE "quote_form_block" SET "serviceTypeOptions" = '["Межкомнатные двери", "Входные двери", "Окна", "Потолки", "Жалюзи", "Мебель", "Ремонт квартир"]'::jsonb WHERE "id" = 'main' AND "serviceTypeOptions" IS NULL;
