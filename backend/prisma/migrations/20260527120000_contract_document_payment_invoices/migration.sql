-- CreateTable
CREATE TABLE "contract_document_payment_invoice_counter" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contract_document_payment_invoice_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_document_payment_invoices" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "addendumNumber" INTEGER,
    "basis" TEXT NOT NULL,
    "legacyFormId" TEXT,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_payment_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_document_payment_invoices_sequenceNumber_key" ON "contract_document_payment_invoices"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "contract_document_payment_invoices_packageId_legacyFormId_key" ON "contract_document_payment_invoices"("packageId", "legacyFormId");

-- CreateIndex
CREATE INDEX "contract_document_payment_invoices_packageId_idx" ON "contract_document_payment_invoices"("packageId");

-- CreateIndex
CREATE INDEX "contract_document_payment_invoices_invoiceDate_idx" ON "contract_document_payment_invoices"("invoiceDate");

-- AddForeignKey
ALTER TABLE "contract_document_payment_invoices" ADD CONSTRAINT "contract_document_payment_invoices_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_document_payment_invoices" ADD CONSTRAINT "contract_document_payment_invoices_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "contract_document_payment_invoice_counter" ("id", "value") VALUES ('global', 0);
