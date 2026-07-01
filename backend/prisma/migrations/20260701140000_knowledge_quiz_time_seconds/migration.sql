ALTER TABLE "knowledge_platform_settings"
    RENAME COLUMN "quizTimePerQuestionMinutes" TO "quizTimePerQuestionSeconds";

UPDATE "knowledge_platform_settings"
SET "quizTimePerQuestionSeconds" = "quizTimePerQuestionSeconds" * 60;

ALTER TABLE "knowledge_material_quizzes"
    RENAME COLUMN "timePerQuestionMinutes" TO "timePerQuestionSeconds";

UPDATE "knowledge_material_quizzes"
SET "timePerQuestionSeconds" = "timePerQuestionSeconds" * 60;

ALTER TABLE "knowledge_platform_settings"
    ALTER COLUMN "quizTimePerQuestionSeconds" SET DEFAULT 60;

ALTER TABLE "knowledge_material_quizzes"
    ALTER COLUMN "timePerQuestionSeconds" SET DEFAULT 60;
