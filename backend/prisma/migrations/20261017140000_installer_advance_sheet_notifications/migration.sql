-- AlterTable
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnInstallerAdvanceSheets" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnInstallerAdvanceSheets" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "installer_advance_sheet_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installer_advance_sheet_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "installer_advance_sheet_bell_events_recipientId_createdAt_idx" ON "installer_advance_sheet_bell_events"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "installer_advance_sheet_bell_events_sheetId_idx" ON "installer_advance_sheet_bell_events"("sheetId");

-- AddForeignKey
ALTER TABLE "installer_advance_sheet_bell_events" ADD CONSTRAINT "installer_advance_sheet_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_advance_sheet_bell_events" ADD CONSTRAINT "installer_advance_sheet_bell_events_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "installer_advance_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
