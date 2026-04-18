-- AlterTable
ALTER TABLE "blog_posts" DROP COLUMN "allowComments";

-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN "featuredImageAlt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "blog_posts" ADD COLUMN "badge" TEXT;
ALTER TABLE "blog_posts" ADD COLUMN "readingTimeMinutes" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "blog_posts" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "blog_posts" ADD COLUMN "authorByline" TEXT;

-- Подставить alt для существующих записей с обложкой (до ручной правки в админке)
UPDATE "blog_posts"
SET "featuredImageAlt" = LEFT("title", 500)
WHERE "featuredImage" IS NOT NULL
  AND TRIM("featuredImage") <> ''
  AND TRIM("featuredImageAlt") = '';
