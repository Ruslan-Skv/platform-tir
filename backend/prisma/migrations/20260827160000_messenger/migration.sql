-- CreateEnum
CREATE TYPE "MessengerConversationType" AS ENUM ('DIRECT', 'CHANNEL', 'KANBAN_CARD');

-- CreateTable
CREATE TABLE "messenger_conversations" (
    "id" TEXT NOT NULL,
    "type" "MessengerConversationType" NOT NULL,
    "title" TEXT,
    "isGeneral" BOOLEAN NOT NULL DEFAULT false,
    "kanbanCardId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messenger_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messenger_members" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messenger_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messenger_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "messenger_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "messenger_conversations_kanbanCardId_key" ON "messenger_conversations"("kanbanCardId");

-- CreateIndex
CREATE INDEX "messenger_conversations_type_idx" ON "messenger_conversations"("type");

-- CreateIndex
CREATE INDEX "messenger_conversations_createdById_idx" ON "messenger_conversations"("createdById");

-- CreateIndex
CREATE INDEX "messenger_members_userId_idx" ON "messenger_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "messenger_members_conversationId_userId_key" ON "messenger_members"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "messenger_messages_conversationId_createdAt_idx" ON "messenger_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messenger_messages_authorId_idx" ON "messenger_messages"("authorId");

-- AddForeignKey
ALTER TABLE "messenger_conversations" ADD CONSTRAINT "messenger_conversations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messenger_conversations" ADD CONSTRAINT "messenger_conversations_kanbanCardId_fkey" FOREIGN KEY ("kanbanCardId") REFERENCES "kanban_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messenger_members" ADD CONSTRAINT "messenger_members_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "messenger_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messenger_members" ADD CONSTRAINT "messenger_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messenger_messages" ADD CONSTRAINT "messenger_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "messenger_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messenger_messages" ADD CONSTRAINT "messenger_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
