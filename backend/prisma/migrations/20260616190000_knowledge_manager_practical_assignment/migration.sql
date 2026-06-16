ALTER TABLE "knowledge_materials"
    ADD COLUMN IF NOT EXISTS "managerPracticalAssignment" TEXT;

UPDATE "knowledge_materials"
SET "managerPracticalAssignment" = 'На ближайших 3 встречах целенаправленно определите психотип клиента и намеренно используйте минимум одну фразу, адаптированную под него. Запишите результат – повысилась ли его вовлеченность. Обсудите на планерке.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE slug = 'b2c-prodazhi-remont-osteklenie'
  AND ("managerPracticalAssignment" IS NULL OR "managerPracticalAssignment" = '');
