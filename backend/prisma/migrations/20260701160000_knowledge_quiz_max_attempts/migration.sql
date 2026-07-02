ALTER TABLE "knowledge_platform_settings"
    ADD COLUMN IF NOT EXISTS "quizMaxAttemptsPerDay" INTEGER NOT NULL DEFAULT 3;
