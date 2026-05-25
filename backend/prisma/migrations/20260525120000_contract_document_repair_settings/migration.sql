-- CreateTable
CREATE TABLE "contract_document_repair_settings" (
    "kind" "ContractDocumentPackageKind" NOT NULL,
    "defaultWorkPeriodDays" INTEGER NOT NULL DEFAULT 60,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_repair_settings_pkey" PRIMARY KEY ("kind")
);

-- AddForeignKey
ALTER TABLE "contract_document_repair_settings" ADD CONSTRAINT "contract_document_repair_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default for REPAIR
INSERT INTO "contract_document_repair_settings" ("kind", "defaultWorkPeriodDays", "updatedAt")
VALUES ('REPAIR', 60, CURRENT_TIMESTAMP)
ON CONFLICT ("kind") DO NOTHING;
