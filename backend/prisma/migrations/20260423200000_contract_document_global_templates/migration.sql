-- CreateTable
CREATE TABLE "contract_document_global_templates" (
    "id" TEXT NOT NULL,
    "kind" "ContractDocumentPackageKind" NOT NULL,
    "tab" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_global_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_document_global_templates_kind_tab_key" ON "contract_document_global_templates"("kind", "tab");

-- AddForeignKey
ALTER TABLE "contract_document_global_templates" ADD CONSTRAINT "contract_document_global_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
