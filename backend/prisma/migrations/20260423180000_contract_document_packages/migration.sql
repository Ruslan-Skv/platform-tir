-- CreateEnum
CREATE TYPE "ContractDocumentPackageKind" AS ENUM ('REPAIR', 'WINDOWS', 'DOORS', 'CEILINGS', 'BLINDS', 'FURNITURE');

-- CreateTable
CREATE TABLE "contract_document_packages" (
    "id" TEXT NOT NULL,
    "kind" "ContractDocumentPackageKind" NOT NULL,
    "title" TEXT,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_document_packages_kind_idx" ON "contract_document_packages"("kind");

-- CreateIndex
CREATE INDEX "contract_document_packages_createdAt_idx" ON "contract_document_packages"("createdAt");

-- AddForeignKey
ALTER TABLE "contract_document_packages" ADD CONSTRAINT "contract_document_packages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
