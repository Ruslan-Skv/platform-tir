-- CreateTable
CREATE TABLE "site_platform_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "KnowledgePlatformFeedbackType" NOT NULL,
    "text" TEXT NOT NULL,
    "pageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "site_platform_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_platform_feedback_userId_idx" ON "site_platform_feedback"("userId");

-- CreateIndex
CREATE INDEX "site_platform_feedback_type_idx" ON "site_platform_feedback"("type");

-- CreateIndex
CREATE INDEX "site_platform_feedback_createdAt_idx" ON "site_platform_feedback"("createdAt");

-- CreateIndex
CREATE INDEX "site_platform_feedback_readAt_idx" ON "site_platform_feedback"("readAt");

-- AddForeignKey
ALTER TABLE "site_platform_feedback" ADD CONSTRAINT "site_platform_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnSiteFeedback" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnSiteFeedback" BOOLEAN NOT NULL DEFAULT true;
