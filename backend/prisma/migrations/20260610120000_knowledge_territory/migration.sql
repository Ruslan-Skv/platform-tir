-- Территория знаний: категории, материалы, вложения, прогресс просмотра видео

DO $$ BEGIN
    CREATE TYPE "KnowledgeMaterialType" AS ENUM ('ARTICLE', 'VIDEO', 'LINK');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "knowledge_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_categories_slug_key" ON "knowledge_categories"("slug");

CREATE TABLE IF NOT EXISTS "knowledge_materials" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "KnowledgeMaterialType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "videoUrl" TEXT,
    "externalUrl" TEXT,
    "thumbnailUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_materials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_materials_slug_key" ON "knowledge_materials"("slug");
CREATE INDEX IF NOT EXISTS "knowledge_materials_categoryId_idx" ON "knowledge_materials"("categoryId");
CREATE INDEX IF NOT EXISTS "knowledge_materials_type_idx" ON "knowledge_materials"("type");
CREATE INDEX IF NOT EXISTS "knowledge_materials_status_idx" ON "knowledge_materials"("status");
CREATE INDEX IF NOT EXISTS "knowledge_materials_isPinned_idx" ON "knowledge_materials"("isPinned");

CREATE TABLE IF NOT EXISTS "knowledge_material_attachments" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_material_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_material_attachments_materialId_idx" ON "knowledge_material_attachments"("materialId");

CREATE TABLE IF NOT EXISTS "knowledge_video_progress" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "positionSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_video_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_video_progress_materialId_userId_key" ON "knowledge_video_progress"("materialId", "userId");
CREATE INDEX IF NOT EXISTS "knowledge_video_progress_userId_idx" ON "knowledge_video_progress"("userId");

DO $$ BEGIN
    ALTER TABLE "knowledge_materials" ADD CONSTRAINT "knowledge_materials_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "knowledge_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "knowledge_materials" ADD CONSTRAINT "knowledge_materials_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "knowledge_material_attachments" ADD CONSTRAINT "knowledge_material_attachments_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "knowledge_video_progress" ADD CONSTRAINT "knowledge_video_progress_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "knowledge_video_progress" ADD CONSTRAINT "knowledge_video_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
