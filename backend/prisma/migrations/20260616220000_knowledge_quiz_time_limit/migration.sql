ALTER TABLE "knowledge_material_quizzes"
    ADD COLUMN IF NOT EXISTS "timePerQuestionMinutes" INTEGER NOT NULL DEFAULT 1;
