-- AlterTable
ALTER TABLE "knowledge_categories" ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "knowledge_modules" ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "knowledge_materials" ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by_id" TEXT;

-- CreateIndex
CREATE INDEX "knowledge_categories_deleted_at_idx" ON "knowledge_categories"("deleted_at");

-- CreateIndex
CREATE INDEX "knowledge_modules_deleted_at_idx" ON "knowledge_modules"("deleted_at");

-- CreateIndex
CREATE INDEX "knowledge_materials_deleted_at_idx" ON "knowledge_materials"("deleted_at");

-- AddForeignKey
ALTER TABLE "knowledge_categories" ADD CONSTRAINT "knowledge_categories_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_modules" ADD CONSTRAINT "knowledge_modules_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_materials" ADD CONSTRAINT "knowledge_materials_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
