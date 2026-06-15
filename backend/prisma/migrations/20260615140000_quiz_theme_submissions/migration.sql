-- AlterTable
ALTER TABLE "quiz_landings" ADD COLUMN "theme" JSONB;

-- AlterTable
ALTER TABLE "quiz_submissions" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "quiz_submissions" ADD COLUMN "managerNote" TEXT;
ALTER TABLE "quiz_submissions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "quiz_submissions_quizId_status_idx" ON "quiz_submissions"("quizId", "status");
