-- Личные настройки уведомлений: событие электронного подписания договоров
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnContractSigning" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnContractSigning" BOOLEAN NOT NULL DEFAULT true;

-- События подписания для колокольчика (лично автору сессии подписания)
CREATE TABLE "contract_signing_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_signing_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_signing_bell_events_recipientId_createdAt_idx" ON "contract_signing_bell_events"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "contract_signing_bell_events_packageId_idx" ON "contract_signing_bell_events"("packageId");

-- AddForeignKey
ALTER TABLE "contract_signing_bell_events" ADD CONSTRAINT "contract_signing_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
