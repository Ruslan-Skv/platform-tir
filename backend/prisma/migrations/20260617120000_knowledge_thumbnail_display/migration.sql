-- CreateEnum
CREATE TYPE "KnowledgeThumbnailDisplay" AS ENUM ('COVER', 'CONTAIN', 'NATURAL');

-- AlterTable
ALTER TABLE "knowledge_materials"
ADD COLUMN "thumbnailDisplay" "KnowledgeThumbnailDisplay" NOT NULL DEFAULT 'COVER';
