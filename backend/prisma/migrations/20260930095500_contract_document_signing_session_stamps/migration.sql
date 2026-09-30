-- AlterTable
ALTER TABLE "contract_document_signing_sessions" ADD COLUMN     "contractorLabel" TEXT,
ADD COLUMN     "contractorSignatory" TEXT,
ADD COLUMN     "signedPackageUrl" TEXT;

