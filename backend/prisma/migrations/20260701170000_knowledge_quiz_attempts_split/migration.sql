ALTER TABLE "knowledge_platform_settings"
    ADD COLUMN IF NOT EXISTS "materialQuizMaxAttemptsPerDay" INTEGER,
    ADD COLUMN IF NOT EXISTS "categoryQuizMaxAttemptsPerDay" INTEGER;

UPDATE "knowledge_platform_settings"
SET
    "materialQuizMaxAttemptsPerDay" = COALESCE(
        "materialQuizMaxAttemptsPerDay",
        "quizMaxAttemptsPerDay",
        3
    ),
    "categoryQuizMaxAttemptsPerDay" = COALESCE(
        "categoryQuizMaxAttemptsPerDay",
        "quizMaxAttemptsPerDay",
        3
    );

ALTER TABLE "knowledge_platform_settings"
    ALTER COLUMN "materialQuizMaxAttemptsPerDay" SET NOT NULL,
    ALTER COLUMN "materialQuizMaxAttemptsPerDay" SET DEFAULT 3,
    ALTER COLUMN "categoryQuizMaxAttemptsPerDay" SET NOT NULL,
    ALTER COLUMN "categoryQuizMaxAttemptsPerDay" SET DEFAULT 3;

ALTER TABLE "knowledge_platform_settings"
    DROP COLUMN IF EXISTS "quizMaxAttemptsPerDay";
