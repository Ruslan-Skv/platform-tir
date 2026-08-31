-- CreateEnum
CREATE TYPE "ContractDocumentSigningSessionStatus" AS ENUM ('PENDING', 'VIEWED', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "contract_document_signing_sessions" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "ContractDocumentSigningSessionStatus" NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "managerNote" TEXT,
    "otpCodeHash" TEXT NOT NULL,
    "otpExpiresAt" TIMESTAMP(3) NOT NULL,
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "signedName" TEXT,
    "signedIp" TEXT,
    "signedUserAgent" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_signing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_document_signing_sessions_token_key" ON "contract_document_signing_sessions"("token");

-- CreateIndex
CREATE INDEX "contract_document_signing_sessions_packageId_createdAt_idx" ON "contract_document_signing_sessions"("packageId", "createdAt");

-- CreateIndex
CREATE INDEX "contract_document_signing_sessions_status_idx" ON "contract_document_signing_sessions"("status");

-- CreateIndex
CREATE INDEX "contract_document_signing_sessions_expiresAt_idx" ON "contract_document_signing_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "contract_document_signing_sessions" ADD CONSTRAINT "contract_document_signing_sessions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_document_signing_sessions" ADD CONSTRAINT "contract_document_signing_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
