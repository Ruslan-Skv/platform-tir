-- CreateTable
CREATE TABLE "messenger_message_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messenger_message_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messenger_message_bell_events_recipientId_createdAt_idx" ON "messenger_message_bell_events"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "messenger_message_bell_events_messageId_idx" ON "messenger_message_bell_events"("messageId");

-- AddForeignKey
ALTER TABLE "messenger_message_bell_events" ADD CONSTRAINT "messenger_message_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messenger_message_bell_events" ADD CONSTRAINT "messenger_message_bell_events_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messenger_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
