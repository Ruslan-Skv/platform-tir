-- CreateTable
CREATE TABLE "kanban_card_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kanban_card_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kanban_card_bell_events_recipientId_createdAt_idx" ON "kanban_card_bell_events"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "kanban_card_bell_events_cardId_idx" ON "kanban_card_bell_events"("cardId");

-- AddForeignKey
ALTER TABLE "kanban_card_bell_events" ADD CONSTRAINT "kanban_card_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_card_bell_events" ADD CONSTRAINT "kanban_card_bell_events_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "kanban_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
