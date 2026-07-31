-- AlterTable
ALTER TABLE "waybill_tasks" ADD COLUMN "createdById" TEXT;
ALTER TABLE "waybill_tasks" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "waybill_tasks" ADD COLUMN "deleted_by_id" TEXT;

-- CreateIndex
CREATE INDEX "waybill_tasks_deleted_at_idx" ON "waybill_tasks"("deleted_at");
CREATE INDEX "waybill_tasks_createdById_idx" ON "waybill_tasks"("createdById");

-- AddForeignKey
ALTER TABLE "waybill_tasks" ADD CONSTRAINT "waybill_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "waybill_tasks" ADD CONSTRAINT "waybill_tasks_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
