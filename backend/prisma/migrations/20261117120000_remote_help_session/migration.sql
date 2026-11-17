-- Удалённая помощь: журнал сеансов WebRTC-подключения суперадмина к экрану сотрудника

-- СоздатьEnum
CREATE TYPE "RemoteHelpSessionStatus" AS ENUM ('REQUESTED', 'PENDING', 'ACTIVE', 'ENDED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "remote_help_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "status" "RemoteHelpSessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,

    CONSTRAINT "remote_help_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remote_help_sessions_userId_createdAt_idx" ON "remote_help_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "remote_help_sessions_adminId_idx" ON "remote_help_sessions"("adminId");

-- CreateIndex
CREATE INDEX "remote_help_sessions_status_createdAt_idx" ON "remote_help_sessions"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "remote_help_sessions" ADD CONSTRAINT "remote_help_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_help_sessions" ADD CONSTRAINT "remote_help_sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
