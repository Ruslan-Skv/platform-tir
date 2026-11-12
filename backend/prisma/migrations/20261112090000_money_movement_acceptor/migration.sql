-- Принявший оплату и держатель кассы в журнале ДП: оплата по чужому договору
-- мог провести другой менеджер (клиент пришёл в другой офис / подмена).
ALTER TABLE "money_movements" ADD COLUMN "acceptedById" TEXT;
ALTER TABLE "money_movements" ADD COLUMN "cashHolderId" TEXT;

-- Кто фактически принял оплату: для авто-записей — записавший оплату
-- в «Оплаты и Управление договором».
UPDATE "money_movements" m
SET "acceptedById" = p."recordedById"
FROM "contract_document_package_payments" p
WHERE m."sourceId" = p."id" AND p."recordedById" IS NOT NULL;

-- Остатки касс на момент деплоя не переводим: держатель кассы существующих
-- записей — менеджер движения. По акцептору касса считается для новых оплат.
UPDATE "money_movements" SET "cashHolderId" = "managerId";

-- CreateIndex
CREATE INDEX "money_movements_acceptedById_idx" ON "money_movements"("acceptedById");
CREATE INDEX "money_movements_cashHolderId_idx" ON "money_movements"("cashHolderId");

-- AddForeignKey
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_cashHolderId_fkey" FOREIGN KEY ("cashHolderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
