ALTER TABLE "knowledge_platform_settings"
    ADD COLUMN IF NOT EXISTS "materialQuizRetryCooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS "categoryQuizRetryCooldownMinutes" INTEGER NOT NULL DEFAULT 30;
