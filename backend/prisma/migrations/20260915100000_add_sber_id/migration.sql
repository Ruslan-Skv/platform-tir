-- ID аккаунта Сбер ID для OAuth
ALTER TABLE "User" ADD COLUMN "sberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_sberId_key" ON "User"("sberId");
