-- Дата публикации на сайте (отдельно от createdAt записи в админке)
ALTER TABLE "photo_projects" ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "photo_projects" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

ALTER TABLE "photo_projects" ALTER COLUMN "publishedAt" SET NOT NULL;
ALTER TABLE "photo_projects" ALTER COLUMN "publishedAt" SET DEFAULT CURRENT_TIMESTAMP;
