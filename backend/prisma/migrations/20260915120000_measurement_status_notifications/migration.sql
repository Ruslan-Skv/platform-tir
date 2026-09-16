-- Личные настройки уведомлений: событие изменения статусов замеров
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnMeasurements" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnMeasurements" BOOLEAN NOT NULL DEFAULT true;

-- События замеров для колокольчика (менеджеру и замерщику)
CREATE TABLE "measurement_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "measurementId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "measurement_bell_events_recipientId_createdAt_idx" ON "measurement_bell_events"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "measurement_bell_events_measurementId_idx" ON "measurement_bell_events"("measurementId");

-- AddForeignKey
ALTER TABLE "measurement_bell_events" ADD CONSTRAINT "measurement_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_bell_events" ADD CONSTRAINT "measurement_bell_events_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "measurements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
