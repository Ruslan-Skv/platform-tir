-- CreateTable
CREATE TABLE "calendar_custom_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "date" DATE NOT NULL,
    "timeFrom" TEXT,
    "timeTo" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "calendar_custom_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_custom_event_recipients" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_custom_event_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_custom_event_bell_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_custom_event_bell_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_custom_events_date_idx" ON "calendar_custom_events"("date");

-- CreateIndex
CREATE INDEX "calendar_custom_events_createdById_idx" ON "calendar_custom_events"("createdById");

-- CreateIndex
CREATE INDEX "calendar_custom_event_recipients_userId_idx" ON "calendar_custom_event_recipients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_custom_event_recipients_eventId_userId_key" ON "calendar_custom_event_recipients"("eventId", "userId");

-- CreateIndex
CREATE INDEX "calendar_custom_event_bell_events_recipientId_createdAt_idx" ON "calendar_custom_event_bell_events"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "calendar_custom_event_bell_events_calendarEventId_idx" ON "calendar_custom_event_bell_events"("calendarEventId");

-- AddForeignKey
ALTER TABLE "calendar_custom_events" ADD CONSTRAINT "calendar_custom_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_custom_event_recipients" ADD CONSTRAINT "calendar_custom_event_recipients_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_custom_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_custom_event_recipients" ADD CONSTRAINT "calendar_custom_event_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_custom_event_bell_events" ADD CONSTRAINT "calendar_custom_event_bell_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_custom_event_bell_events" ADD CONSTRAINT "calendar_custom_event_bell_events_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_custom_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
