-- CreateTable
CREATE TABLE "knowledge_target_audiences" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_target_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_material_target_audiences" (
    "materialId" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,

    CONSTRAINT "knowledge_material_target_audiences_pkey" PRIMARY KEY ("materialId","audienceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_target_audiences_label_key" ON "knowledge_target_audiences"("label");

-- CreateIndex
CREATE INDEX "knowledge_material_target_audiences_audienceId_idx" ON "knowledge_material_target_audiences"("audienceId");

-- AddForeignKey
ALTER TABLE "knowledge_material_target_audiences" ADD CONSTRAINT "knowledge_material_target_audiences_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_material_target_audiences" ADD CONSTRAINT "knowledge_material_target_audiences_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "knowledge_target_audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy single-string targetAudience
INSERT INTO "knowledge_target_audiences" ("id", "label", "sortOrder")
SELECT
    'kta_' || substr(md5(trimmed.label), 1, 21),
    trimmed.label,
    (ROW_NUMBER() OVER (ORDER BY trimmed.label) - 1)::int
FROM (
    SELECT DISTINCT TRIM("targetAudience") AS label
    FROM "knowledge_materials"
    WHERE "targetAudience" IS NOT NULL AND TRIM("targetAudience") <> ''
) trimmed;

INSERT INTO "knowledge_material_target_audiences" ("materialId", "audienceId")
SELECT m.id, a.id
FROM "knowledge_materials" m
INNER JOIN "knowledge_target_audiences" a ON a.label = TRIM(m."targetAudience")
WHERE m."targetAudience" IS NOT NULL AND TRIM(m."targetAudience") <> '';

-- AlterTable
ALTER TABLE "knowledge_materials" DROP COLUMN "targetAudience";
