-- CreateTable
CREATE TABLE "contract_document_package_versions" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT,
    "status" "ContractDocumentPackageStatus" NOT NULL,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "crmContractId" TEXT,
    "savedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_document_package_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_document_package_versions_packageId_versionNumber_key" ON "contract_document_package_versions"("packageId", "versionNumber");

-- CreateIndex
CREATE INDEX "contract_document_package_versions_packageId_createdAt_idx" ON "contract_document_package_versions"("packageId", "createdAt");

-- AddForeignKey
ALTER TABLE "contract_document_package_versions" ADD CONSTRAINT "contract_document_package_versions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_document_package_versions" ADD CONSTRAINT "contract_document_package_versions_savedById_fkey" FOREIGN KEY ("savedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
