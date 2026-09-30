-- Событие «Итоги продаж» (каждый 1 млн ₽ за месяц): чекбоксы в настройках уведомлений
ALTER TABLE "admin_notifications_block" ADD COLUMN "notifyOnSalesTotals" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_admin_notification_override" ADD COLUMN "notifyOnSalesTotals" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "sales_total_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "millions" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_total_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_total_milestone_state" (
    "periodMonth" TEXT NOT NULL,
    "lastNotifiedMillions" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_total_milestone_state_pkey" PRIMARY KEY ("periodMonth")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_total_bell_events_recipientId_periodMonth_millions_key" ON "sales_total_bell_events"("recipientId", "periodMonth", "millions");

-- CreateIndex
CREATE INDEX "sales_total_bell_events_recipientId_createdAt_idx" ON "sales_total_bell_events"("recipientId", "createdAt");

-- AddForeignKey
ALTER TABLE "sales_total_bell_events" ADD CONSTRAINT "sales_total_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
