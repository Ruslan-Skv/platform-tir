ALTER TABLE "contract_document_packages"
ADD COLUMN "responsibleManagerId" TEXT;

UPDATE "contract_document_packages"
SET "responsibleManagerId" = "createdById"
WHERE "responsibleManagerId" IS NULL
  AND "createdById" IS NOT NULL;

CREATE INDEX "contract_document_packages_responsibleManagerId_idx"
ON "contract_document_packages"("responsibleManagerId");

ALTER TABLE "contract_document_packages"
ADD CONSTRAINT "contract_document_packages_responsibleManagerId_fkey"
FOREIGN KEY ("responsibleManagerId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
