-- AlterTable
ALTER TABLE "repair_schedule_projects" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "repair_schedule_projects" ADD COLUMN "deleted_by_id" TEXT;

-- CreateIndex
CREATE INDEX "repair_schedule_projects_deleted_at_idx" ON "repair_schedule_projects"("deleted_at");

-- AddForeignKey
ALTER TABLE "repair_schedule_projects" ADD CONSTRAINT "repair_schedule_projects_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
