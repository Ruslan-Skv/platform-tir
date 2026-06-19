-- CreateTable
CREATE TABLE "knowledge_material_likes" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_material_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_material_likes_materialId_idx" ON "knowledge_material_likes"("materialId");

-- CreateIndex
CREATE INDEX "knowledge_material_likes_userId_idx" ON "knowledge_material_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_material_likes_materialId_userId_key" ON "knowledge_material_likes"("materialId", "userId");

-- AddForeignKey
ALTER TABLE "knowledge_material_likes" ADD CONSTRAINT "knowledge_material_likes_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_material_likes" ADD CONSTRAINT "knowledge_material_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
