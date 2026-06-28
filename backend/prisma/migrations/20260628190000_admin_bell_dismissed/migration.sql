-- CreateTable
CREATE TABLE "admin_bell_dismissed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_bell_dismissed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_bell_dismissed_userId_key_key" ON "admin_bell_dismissed"("userId", "key");

-- CreateIndex
CREATE INDEX "admin_bell_dismissed_userId_dismissedAt_idx" ON "admin_bell_dismissed"("userId", "dismissedAt");

-- AddForeignKey
ALTER TABLE "admin_bell_dismissed" ADD CONSTRAINT "admin_bell_dismissed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
