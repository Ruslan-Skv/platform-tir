-- AlterTable
ALTER TABLE "users" ADD COLUMN "employeeCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeCode_key" ON "users"("employeeCode");

-- AlterTable
ALTER TABLE "crm_directions" ADD COLUMN "numberLetter" TEXT;

-- CreateTable
CREATE TABLE "contract_document_number_counters" (
    "id" TEXT NOT NULL,
    "managerUserId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contract_document_number_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_document_number_counters_directionId_idx" ON "contract_document_number_counters"("directionId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_document_number_counters_managerUserId_directionId_key" ON "contract_document_number_counters"("managerUserId", "directionId");

-- AddForeignKey
ALTER TABLE "contract_document_number_counters" ADD CONSTRAINT "contract_document_number_counters_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_document_number_counters" ADD CONSTRAINT "contract_document_number_counters_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "crm_directions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default direction letters for contract numbering
UPDATE "crm_directions" SET "numberLetter" = 'д' WHERE "slug" = 'doors' AND ("numberLetter" IS NULL OR "numberLetter" = '');
UPDATE "crm_directions" SET "numberLetter" = 'о' WHERE "slug" = 'windows' AND ("numberLetter" IS NULL OR "numberLetter" = '');
UPDATE "crm_directions" SET "numberLetter" = 'п' WHERE "slug" = 'stretch-ceilings' AND ("numberLetter" IS NULL OR "numberLetter" = '');
UPDATE "crm_directions" SET "numberLetter" = 'ж' WHERE "slug" = 'blinds' AND ("numberLetter" IS NULL OR "numberLetter" = '');
UPDATE "crm_directions" SET "numberLetter" = 'м' WHERE "slug" = 'furniture' AND ("numberLetter" IS NULL OR "numberLetter" = '');
UPDATE "crm_directions" SET "numberLetter" = 'р' WHERE "slug" = 'repair' AND ("numberLetter" IS NULL OR "numberLetter" = '');
