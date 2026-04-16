-- AlterTable
ALTER TABLE "photo_projects" ADD COLUMN "displayModeMobile" TEXT NOT NULL DEFAULT 'grid';

UPDATE "photo_projects" SET "displayModeMobile" = "displayMode";
