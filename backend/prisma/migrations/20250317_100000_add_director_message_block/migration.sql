-- CreateTable
CREATE TABLE "director_message_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "directorEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "director_message_block_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN "subject" TEXT;

-- Insert default row for director_message_block
INSERT INTO "director_message_block" ("id", "directorEmail", "updatedAt") VALUES ('main', NULL, NOW());
