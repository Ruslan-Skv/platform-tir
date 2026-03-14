-- AlterTable
ALTER TABLE "users" ADD COLUMN "yandexId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_yandexId_key" ON "users"("yandexId");
