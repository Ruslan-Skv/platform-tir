-- CreateTable
CREATE TABLE "contract_document_package_payments" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentForm" "PaymentForm" NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "addendumNumber" INTEGER,
    "basis" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_document_package_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_document_package_payments_packageId_idx" ON "contract_document_package_payments"("packageId");

-- CreateIndex
CREATE INDEX "contract_document_package_payments_paymentDate_idx" ON "contract_document_package_payments"("paymentDate");

-- AddForeignKey
ALTER TABLE "contract_document_package_payments" ADD CONSTRAINT "contract_document_package_payments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_document_package_payments" ADD CONSTRAINT "contract_document_package_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
