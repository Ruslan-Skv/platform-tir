-- История уведомлений колокольчика админки (персонально для каждого админа)
CREATE TABLE "admin_bell_notification_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "link" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_bell_notification_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_bell_notification_history_userId_key_key" ON "admin_bell_notification_history"("userId", "key");

-- CreateIndex
CREATE INDEX "admin_bell_notification_history_userId_readAt_idx" ON "admin_bell_notification_history"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "admin_bell_notification_history" ADD CONSTRAINT "admin_bell_notification_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
