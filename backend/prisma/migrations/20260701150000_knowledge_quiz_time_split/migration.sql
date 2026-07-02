ALTER TABLE "knowledge_platform_settings"
    ADD COLUMN IF NOT EXISTS "materialQuizTimePerQuestionSeconds" INTEGER,
    ADD COLUMN IF NOT EXISTS "categoryQuizTimePerQuestionSeconds" INTEGER;

UPDATE "knowledge_platform_settings"
SET
    "materialQuizTimePerQuestionSeconds" = COALESCE(
        "materialQuizTimePerQuestionSeconds",
        "quizTimePerQuestionSeconds",
        60
    ),
    "categoryQuizTimePerQuestionSeconds" = COALESCE(
        "categoryQuizTimePerQuestionSeconds",
        "quizTimePerQuestionSeconds",
        60
    );

ALTER TABLE "knowledge_platform_settings"
    ALTER COLUMN "materialQuizTimePerQuestionSeconds" SET NOT NULL,
    ALTER COLUMN "materialQuizTimePerQuestionSeconds" SET DEFAULT 60,
    ALTER COLUMN "categoryQuizTimePerQuestionSeconds" SET NOT NULL,
    ALTER COLUMN "categoryQuizTimePerQuestionSeconds" SET DEFAULT 60;

ALTER TABLE "knowledge_platform_settings"
    DROP COLUMN IF EXISTS "quizTimePerQuestionSeconds";
