-- CreateEnum
CREATE TYPE "BlogContentAlign" AS ENUM ('LEFT', 'JUSTIFY', 'CENTER', 'RIGHT');

-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN "contentAlign" "BlogContentAlign" NOT NULL DEFAULT 'JUSTIFY';
