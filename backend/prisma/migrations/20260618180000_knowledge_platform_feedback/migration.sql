-- CreateEnum
CREATE TYPE "KnowledgePlatformFeedbackType" AS ENUM ('SUGGESTION', 'BUG');

-- CreateTable
CREATE TABLE "knowledge_platform_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "KnowledgePlatformFeedbackType" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_platform_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_platform_feedback_userId_idx" ON "knowledge_platform_feedback"("userId");

-- CreateIndex
CREATE INDEX "knowledge_platform_feedback_type_idx" ON "knowledge_platform_feedback"("type");

-- CreateIndex
CREATE INDEX "knowledge_platform_feedback_createdAt_idx" ON "knowledge_platform_feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "knowledge_platform_feedback" ADD CONSTRAINT "knowledge_platform_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
