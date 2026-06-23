CREATE TABLE "knowledge_material_favorites" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_material_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_material_favorites_materialId_userId_key" ON "knowledge_material_favorites"("materialId", "userId");
CREATE INDEX "knowledge_material_favorites_materialId_idx" ON "knowledge_material_favorites"("materialId");
CREATE INDEX "knowledge_material_favorites_userId_idx" ON "knowledge_material_favorites"("userId");
CREATE INDEX "knowledge_material_favorites_userId_createdAt_idx" ON "knowledge_material_favorites"("userId", "createdAt");

ALTER TABLE "knowledge_material_favorites" ADD CONSTRAINT "knowledge_material_favorites_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_material_favorites" ADD CONSTRAINT "knowledge_material_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
