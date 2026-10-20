-- Корзина поставщиков (по аналогии с корзиной ДП): мягкое удаление
-- deletedAt/deletedById, безвозвратная чистка старше 30 дней сервисом.

ALTER TABLE "suppliers" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "suppliers" ADD COLUMN "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "suppliers_deletedAt_idx" ON "suppliers"("deletedAt");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
