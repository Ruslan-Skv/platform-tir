-- AlterTable
ALTER TABLE "waybill_tasks" ADD COLUMN     "packageId" TEXT;

-- CreateIndex
CREATE INDEX "waybill_tasks_packageId_idx" ON "waybill_tasks"("packageId");

-- AddForeignKey
ALTER TABLE "waybill_tasks" ADD CONSTRAINT "waybill_tasks_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
