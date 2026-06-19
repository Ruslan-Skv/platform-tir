-- CreateTable
CREATE TABLE "knowledge_material_comments" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_material_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_material_comments_materialId_idx" ON "knowledge_material_comments"("materialId");

-- CreateIndex
CREATE INDEX "knowledge_material_comments_userId_idx" ON "knowledge_material_comments"("userId");

-- CreateIndex
CREATE INDEX "knowledge_material_comments_createdAt_idx" ON "knowledge_material_comments"("createdAt");

-- AddForeignKey
ALTER TABLE "knowledge_material_comments" ADD CONSTRAINT "knowledge_material_comments_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_material_comments" ADD CONSTRAINT "knowledge_material_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
