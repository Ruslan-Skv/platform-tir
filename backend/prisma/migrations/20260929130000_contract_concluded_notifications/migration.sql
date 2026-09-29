-- Уведомления «Договор подписан» (пакет переведён в CONTRACT_CONCLUDED)
-- с раздельными настройками по направлениям.
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnContractConcludedRepair" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnContractConcludedWindows" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnContractConcludedDoors" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnContractConcludedCeilings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnContractConcludedBlinds" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnContractConcludedFurniture" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnContractConcludedRepair" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnContractConcludedWindows" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnContractConcludedDoors" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnContractConcludedCeilings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnContractConcludedBlinds" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnContractConcludedFurniture" BOOLEAN NOT NULL DEFAULT true;

-- Внешние каналы (email, Telegram, MAX) для события «Договор подписан».
ALTER TABLE "external_notify_settings" ADD COLUMN "contractConcludedNotifyEmails" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "contractConcludedNotifyTelegramIds" JSONB;
ALTER TABLE "external_notify_settings" ADD COLUMN "contractConcludedNotifyMaxIds" JSONB;

-- События «Договор подписан» для колокольчика (ответственному менеджеру и автору пакета).
CREATE TABLE "contract_concluded_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_concluded_bell_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contract_concluded_bell_events_recipientId_createdAt_idx" ON "contract_concluded_bell_events"("recipientId", "createdAt");
CREATE INDEX "contract_concluded_bell_events_packageId_idx" ON "contract_concluded_bell_events"("packageId");

ALTER TABLE "contract_concluded_bell_events" ADD CONSTRAINT "contract_concluded_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_concluded_bell_events" ADD CONSTRAINT "contract_concluded_bell_events_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "contract_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
