-- AlterTable
ALTER TABLE "users" ADD COLUMN "sberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_sberId_key" ON "users"("sberId");
