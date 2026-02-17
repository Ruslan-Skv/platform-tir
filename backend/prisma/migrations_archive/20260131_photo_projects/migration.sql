-- CreateTable
CREATE TABLE "photo_projects" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "displayMode" TEXT NOT NULL DEFAULT 'grid',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_projects_categoryId_idx" ON "photo_projects"("categoryId");

-- AddForeignKey
ALTER TABLE "photo_projects" ADD CONSTRAINT "photo_projects_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "photo_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing photos: create default project per category and move photos
INSERT INTO "photo_projects" ("id", "categoryId", "title", "displayMode", "sortOrder", "createdAt", "updatedAt")
SELECT 
  'proj_' || "categoryId",
  "categoryId",
  'Объект',
  'grid',
  0,
  NOW(),
  NOW()
FROM (SELECT DISTINCT "categoryId" FROM "photos") AS cats;

-- Add projectId to photos (temporary, nullable)
ALTER TABLE "photos" ADD COLUMN "projectId" TEXT;

-- Update photos to link to the default project for their category
UPDATE "photos" p
SET "projectId" = (
  SELECT pp."id" FROM "photo_projects" pp 
  WHERE pp."categoryId" = p."categoryId" 
  LIMIT 1
);

-- For photos without project (shouldn't happen), create orphan project - skip for now
-- Make projectId NOT NULL - first delete any photos that couldn't be migrated
DELETE FROM "photos" WHERE "projectId" IS NULL;

ALTER TABLE "photos" ALTER COLUMN "projectId" SET NOT NULL;

-- Drop categoryId from photos
ALTER TABLE "photos" DROP CONSTRAINT "photos_categoryId_fkey";
ALTER TABLE "photos" DROP COLUMN "categoryId";

-- AddForeignKey for photos -> project
ALTER TABLE "photos" ADD CONSTRAINT "photos_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "photo_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
