-- CreateEnum
CREATE TYPE "ContractDocumentPackageStatus" AS ENUM ('IN_PROGRESS', 'CONTRACT_CONCLUDED');

-- AlterTable
ALTER TABLE "contract_document_packages" ADD COLUMN "status" "ContractDocumentPackageStatus" NOT NULL DEFAULT 'IN_PROGRESS';
