CREATE TABLE "knowledge_material_study_completions" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_material_study_completions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_material_study_completions_materialId_userId_key" ON "knowledge_material_study_completions"("materialId", "userId");
CREATE INDEX "knowledge_material_study_completions_materialId_idx" ON "knowledge_material_study_completions"("materialId");
CREATE INDEX "knowledge_material_study_completions_userId_idx" ON "knowledge_material_study_completions"("userId");

ALTER TABLE "knowledge_material_study_completions" ADD CONSTRAINT "knowledge_material_study_completions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_material_study_completions" ADD CONSTRAINT "knowledge_material_study_completions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
