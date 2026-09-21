-- События инкассаций наличных для колокольчика (менеджеру кассы и сдающему).
CREATE TABLE "manager_incassation_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "incassationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_incassation_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE INDEX "manager_incassation_bell_events_recipientId_createdAt_idx" ON "manager_incassation_bell_events"("recipientId", "createdAt");
CREATE INDEX "manager_incassation_bell_events_incassationId_idx" ON "manager_incassation_bell_events"("incassationId");

-- AddForeignKey
ALTER TABLE "manager_incassation_bell_events" ADD CONSTRAINT "manager_incassation_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manager_incassation_bell_events" ADD CONSTRAINT "manager_incassation_bell_events_incassationId_fkey" FOREIGN KEY ("incassationId") REFERENCES "manager_incassations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Настройки события «Инкассации наличных».
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnIncassations" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnIncassations" BOOLEAN NOT NULL DEFAULT true;
