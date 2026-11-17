-- DropIndex
DROP INDEX "suppliers_deletedAt_idx";

-- CreateTable
CREATE TABLE "admin_screenshots" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "width" INTEGER,
    "height" INTEGER,
    "comment" VARCHAR(500),
    "pageUrl" VARCHAR(500),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_screenshots_expiresAt_idx" ON "admin_screenshots"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_screenshots_authorId_createdAt_idx" ON "admin_screenshots"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "admin_screenshots" ADD CONSTRAINT "admin_screenshots_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
