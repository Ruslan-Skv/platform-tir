-- AlterTable
ALTER TABLE "contract_document_packages" ADD COLUMN "crmContractId" TEXT;

-- CreateIndex
CREATE INDEX "contract_document_packages_crmContractId_idx" ON "contract_document_packages"("crmContractId");

-- AddForeignKey
ALTER TABLE "contract_document_packages" ADD CONSTRAINT "contract_document_packages_crmContractId_fkey" FOREIGN KEY ("crmContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
