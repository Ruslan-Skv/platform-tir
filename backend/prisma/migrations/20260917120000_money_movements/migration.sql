-- ДП — журнал денежных движений по договорам
CREATE TABLE "money_movements" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "packageId" TEXT,
    "contractId" TEXT,
    "paymentDate" DATE NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentForm" "PaymentForm" NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "addendumNumber" INTEGER,
    "basis" TEXT,
    "notes" TEXT,
    "managerId" TEXT,
    "contractNumber" TEXT,
    "customerName" TEXT,
    "direction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "money_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "money_movements_sourceId_key" ON "money_movements"("sourceId");

-- CreateIndex
CREATE INDEX "money_movements_paymentDate_idx" ON "money_movements"("paymentDate");

-- CreateIndex
CREATE INDEX "money_movements_performedAt_idx" ON "money_movements"("performedAt");

-- CreateIndex
CREATE INDEX "money_movements_managerId_idx" ON "money_movements"("managerId");

-- CreateIndex
CREATE INDEX "money_movements_direction_idx" ON "money_movements"("direction");

-- CreateIndex
CREATE INDEX "money_movements_packageId_idx" ON "money_movements"("packageId");

-- AddForeignKey
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
