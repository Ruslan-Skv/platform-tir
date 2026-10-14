-- CreateTable
CREATE TABLE "contract_document_package_installer_advances" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "installerId" TEXT,
    "installerName" TEXT,
    "paidAt" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_package_installer_advances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_document_package_installer_advances_packageId_idx" ON "contract_document_package_installer_advances"("packageId");
CREATE INDEX "contract_document_package_installer_advances_installerId_idx" ON "contract_document_package_installer_advances"("installerId");
CREATE INDEX "contract_document_package_installer_advances_paidAt_idx" ON "contract_document_package_installer_advances"("paidAt");

-- AddForeignKey
ALTER TABLE "contract_document_package_installer_advances" ADD CONSTRAINT "contract_document_package_installer_advances_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_document_package_installer_advances" ADD CONSTRAINT "contract_document_package_installer_advances_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "installer_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contract_document_package_installer_advances" ADD CONSTRAINT "contract_document_package_installer_advances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
