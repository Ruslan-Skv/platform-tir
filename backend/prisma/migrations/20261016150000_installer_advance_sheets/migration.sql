-- CreateEnum
CREATE TYPE "InstallerAdvanceSheetItemStatus" AS ENUM ('PENDING', 'QUESTION', 'PAID');

-- AlterTable
ALTER TABLE "contract_document_package_installer_advances" ADD COLUMN     "sheetItemId" TEXT;

-- CreateTable
CREATE TABLE "installer_advance_sheets" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "installerId" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installer_advance_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installer_advance_sheet_items" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "InstallerAdvanceSheetItemStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" DATE,
    "paymentMethod" "InstallerAdvancePaymentMethod",
    "paidById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installer_advance_sheet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installer_advance_sheet_item_comments" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installer_advance_sheet_item_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "installer_advance_sheets_number_key" ON "installer_advance_sheets"("number");

-- CreateIndex
CREATE INDEX "installer_advance_sheets_installerId_idx" ON "installer_advance_sheets"("installerId");

-- CreateIndex
CREATE INDEX "installer_advance_sheets_createdAt_idx" ON "installer_advance_sheets"("createdAt");

-- CreateIndex
CREATE INDEX "installer_advance_sheet_items_sheetId_idx" ON "installer_advance_sheet_items"("sheetId");

-- CreateIndex
CREATE INDEX "installer_advance_sheet_items_packageId_idx" ON "installer_advance_sheet_items"("packageId");

-- CreateIndex
CREATE INDEX "installer_advance_sheet_items_status_idx" ON "installer_advance_sheet_items"("status");

-- CreateIndex
CREATE INDEX "installer_advance_sheet_item_comments_itemId_idx" ON "installer_advance_sheet_item_comments"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_document_package_installer_advances_sheetItemId_key" ON "contract_document_package_installer_advances"("sheetItemId");

-- AddForeignKey
ALTER TABLE "contract_document_package_installer_advances" ADD CONSTRAINT "contract_document_package_installer_advances_sheetItemId_fkey" FOREIGN KEY ("sheetItemId") REFERENCES "installer_advance_sheet_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_advance_sheets" ADD CONSTRAINT "installer_advance_sheets_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "installer_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_advance_sheets" ADD CONSTRAINT "installer_advance_sheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_advance_sheet_items" ADD CONSTRAINT "installer_advance_sheet_items_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "installer_advance_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_advance_sheet_items" ADD CONSTRAINT "installer_advance_sheet_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_advance_sheet_items" ADD CONSTRAINT "installer_advance_sheet_items_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_advance_sheet_item_comments" ADD CONSTRAINT "installer_advance_sheet_item_comments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "installer_advance_sheet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_advance_sheet_item_comments" ADD CONSTRAINT "installer_advance_sheet_item_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

