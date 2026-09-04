-- CreateTable
CREATE TABLE "contract_document_number_holds" (
    "id" TEXT NOT NULL,
    "managerUserId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "composedNumber" TEXT NOT NULL,
    "numberLetter" TEXT,
    "packageId" TEXT NOT NULL,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_number_holds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_document_number_holds_managerUserId_directionId_releasedAt_consumedAt_idx" ON "contract_document_number_holds"("managerUserId", "directionId", "releasedAt", "consumedAt");

-- CreateIndex
CREATE INDEX "contract_document_number_holds_packageId_idx" ON "contract_document_number_holds"("packageId");

-- CreateIndex
CREATE INDEX "contract_document_number_holds_sessionId_idx" ON "contract_document_number_holds"("sessionId");

-- CreateIndex
CREATE INDEX "contract_document_number_holds_expiresAt_idx" ON "contract_document_number_holds"("expiresAt");

-- AddForeignKey
ALTER TABLE "contract_document_number_holds" ADD CONSTRAINT "contract_document_number_holds_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_document_number_holds" ADD CONSTRAINT "contract_document_number_holds_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "crm_directions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_document_number_holds" ADD CONSTRAINT "contract_document_number_holds_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_document_number_holds" ADD CONSTRAINT "contract_document_number_holds_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "contract_document_signing_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
