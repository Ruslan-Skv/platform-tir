-- CreateTable
CREATE TABLE "knowledge_category_quiz_attempts" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scorePercent" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_category_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_category_quiz_attempts_categoryId_userId_idx" ON "knowledge_category_quiz_attempts"("categoryId", "userId");

-- CreateIndex
CREATE INDEX "knowledge_category_quiz_attempts_userId_idx" ON "knowledge_category_quiz_attempts"("userId");

-- AddForeignKey
ALTER TABLE "knowledge_category_quiz_attempts" ADD CONSTRAINT "knowledge_category_quiz_attempts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "knowledge_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_category_quiz_attempts" ADD CONSTRAINT "knowledge_category_quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
