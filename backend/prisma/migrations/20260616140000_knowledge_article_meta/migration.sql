-- Метаданные статей: целевая аудитория и время чтения

ALTER TABLE "knowledge_materials"
    ADD COLUMN IF NOT EXISTS "targetAudience" TEXT,
    ADD COLUMN IF NOT EXISTS "readingTimeMinutes" INTEGER;
