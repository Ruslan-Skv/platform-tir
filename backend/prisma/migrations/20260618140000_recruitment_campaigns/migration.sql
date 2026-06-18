-- CreateEnum
CREATE TYPE "RecruitmentCampaignStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "recruitment_campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "RecruitmentCampaignStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "selectedCandidateId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruitment_campaigns_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable campaignId first
ALTER TABLE "sales_candidates" ADD COLUMN "campaignId" TEXT;

-- Seed archive campaign for existing candidates (if any)
INSERT INTO "recruitment_campaigns" ("id", "title", "status", "startedAt", "closedAt", "createdAt", "updatedAt")
VALUES (
    'recruitment_campaign_archive_legacy',
    'Архив (до внедрения отборов)',
    'CLOSED',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Seed default open campaign
INSERT INTO "recruitment_campaigns" ("id", "title", "status", "startedAt", "createdAt", "updatedAt")
VALUES (
    'recruitment_campaign_default_open',
    'Текущий отбор',
    'OPEN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Assign existing candidates to archive; new rows will get campaign on create
UPDATE "sales_candidates"
SET "campaignId" = 'recruitment_campaign_archive_legacy'
WHERE "campaignId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_campaigns_selectedCandidateId_key" ON "recruitment_campaigns"("selectedCandidateId");
CREATE INDEX "recruitment_campaigns_status_idx" ON "recruitment_campaigns"("status");
CREATE INDEX "recruitment_campaigns_startedAt_idx" ON "recruitment_campaigns"("startedAt");
CREATE INDEX "sales_candidates_campaignId_idx" ON "sales_candidates"("campaignId");

-- AddForeignKey
ALTER TABLE "recruitment_campaigns" ADD CONSTRAINT "recruitment_campaigns_selectedCandidateId_fkey" FOREIGN KEY ("selectedCandidateId") REFERENCES "sales_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recruitment_campaigns" ADD CONSTRAINT "recruitment_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_candidates" ADD CONSTRAINT "sales_candidates_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "recruitment_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Make campaignId required for future inserts (existing rows already set)
ALTER TABLE "sales_candidates" ALTER COLUMN "campaignId" SET NOT NULL;
