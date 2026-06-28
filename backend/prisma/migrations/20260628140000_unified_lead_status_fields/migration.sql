-- Form submissions: unified lead status workflow
ALTER TABLE "form_submissions" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "form_submissions" ADD COLUMN "managerNote" TEXT;
ALTER TABLE "form_submissions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "form_submissions_type_createdAt_idx" ON "form_submissions"("type", "createdAt");
CREATE INDEX "form_submissions_status_idx" ON "form_submissions"("status");

-- Site platform feedback
ALTER TABLE "site_platform_feedback" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "site_platform_feedback" ADD COLUMN "managerNote" TEXT;
UPDATE "site_platform_feedback" SET "status" = 'completed' WHERE "readAt" IS NOT NULL;
CREATE INDEX "site_platform_feedback_status_idx" ON "site_platform_feedback"("status");

-- Knowledge platform feedback
ALTER TABLE "knowledge_platform_feedback" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "knowledge_platform_feedback" ADD COLUMN "managerNote" TEXT;
UPDATE "knowledge_platform_feedback" SET "status" = 'completed' WHERE "readAt" IS NOT NULL;
CREATE INDEX "knowledge_platform_feedback_status_idx" ON "knowledge_platform_feedback"("status");
