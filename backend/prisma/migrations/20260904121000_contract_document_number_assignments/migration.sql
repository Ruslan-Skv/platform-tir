-- CreateTable
CREATE TABLE "contract_document_number_assignments" (
    "id" TEXT NOT NULL,
    "numberKey" TEXT NOT NULL,
    "displayNumber" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_number_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_document_number_assignments_numberKey_key" ON "contract_document_number_assignments"("numberKey");

-- CreateIndex
CREATE INDEX "contract_document_number_assignments_packageId_idx" ON "contract_document_number_assignments"("packageId");

-- AddForeignKey
ALTER TABLE "contract_document_number_assignments" ADD CONSTRAINT "contract_document_number_assignments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
