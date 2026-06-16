ALTER TABLE "knowledge_materials"
    ADD COLUMN IF NOT EXISTS "tutorRecommendation" TEXT;

UPDATE "knowledge_materials"
SET "tutorRecommendation" = 'На очном тренинге после изучения этого конспекта разберите с менеджерами 2–3 реальных кейса из практики компании, чтобы закрепить материал на конкретных примерах.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE slug = 'b2c-prodazhi-remont-osteklenie'
  AND ("tutorRecommendation" IS NULL OR "tutorRecommendation" = '');
