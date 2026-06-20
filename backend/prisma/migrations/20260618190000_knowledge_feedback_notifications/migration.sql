-- AlterTable
ALTER TABLE "knowledge_platform_feedback" ADD COLUMN "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "knowledge_platform_feedback_readAt_idx" ON "knowledge_platform_feedback"("readAt");

-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnKnowledgeFeedback" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnKnowledgeFeedback" BOOLEAN NOT NULL DEFAULT true;
