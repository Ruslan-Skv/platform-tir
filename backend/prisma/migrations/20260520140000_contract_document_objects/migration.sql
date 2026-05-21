-- Объекты договоров (группировка пакетов документов по всем направлениям)
CREATE TABLE "contract_document_objects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerName" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_objects_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contract_document_packages" ADD COLUMN "documentObjectId" TEXT;

CREATE INDEX "contract_document_packages_documentObjectId_idx" ON "contract_document_packages"("documentObjectId");

ALTER TABLE "contract_document_packages" ADD CONSTRAINT "contract_document_packages_documentObjectId_fkey" FOREIGN KEY ("documentObjectId") REFERENCES "contract_document_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
