CREATE TABLE IF NOT EXISTS "knowledge_platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "quizTimePerQuestionMinutes" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_platform_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "knowledge_platform_settings" ("id", "quizTimePerQuestionMinutes", "updatedAt")
VALUES ('main', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
