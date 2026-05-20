-- AlterTable
ALTER TABLE "contract_document_packages" ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by_id" TEXT;

-- CreateIndex
CREATE INDEX "contract_document_packages_deleted_at_idx" ON "contract_document_packages"("deleted_at");

-- AddForeignKey
ALTER TABLE "contract_document_packages" ADD CONSTRAINT "contract_document_packages_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
