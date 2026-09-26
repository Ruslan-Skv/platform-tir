-- Корзина журнала ДП: автор ручной записи и мягкое удаление в корзину.
ALTER TABLE "money_movements" ADD COLUMN "createdById" TEXT;
ALTER TABLE "money_movements" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "money_movements" ADD COLUMN "deleted_by_id" TEXT;

-- CreateIndex
CREATE INDEX "money_movements_deleted_at_idx" ON "money_movements"("deleted_at");
CREATE INDEX "money_movements_createdById_idx" ON "money_movements"("createdById");

-- AddForeignKey
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
