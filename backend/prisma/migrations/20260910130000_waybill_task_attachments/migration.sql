-- Вложения задания путевого листа (PDF, изображения, Word, Excel и т.д.)
CREATE TABLE "waybill_task_attachments" (
    "id" TEXT NOT NULL,
    "waybillTaskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waybill_task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waybill_task_attachments_waybillTaskId_idx" ON "waybill_task_attachments"("waybillTaskId");

-- AddForeignKey
ALTER TABLE "waybill_task_attachments" ADD CONSTRAINT "waybill_task_attachments_waybillTaskId_fkey" FOREIGN KEY ("waybillTaskId") REFERENCES "waybill_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_task_attachments" ADD CONSTRAINT "waybill_task_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
