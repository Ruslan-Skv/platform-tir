-- Раздел «Поставщики»: сальдо начальное на карточке, блоки банковских реквизитов
-- (несколько на поставщика) и ведомость расчётов (счета/оплаты).
-- Сальдо конечное = сальдо начальное + Σ счетов − Σ оплат.

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN "openingBalance" DECIMAL(14,2);
ALTER TABLE "suppliers" ADD COLUMN "openingBalanceDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "supplier_requisites" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankBik" TEXT,
    "corrAccount" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "note" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_requisites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_ledger_entries" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "requisiteId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "documentNo" TEXT,
    "amount" DECIMAL(14,2),
    "payment" DECIMAL(14,2),
    "note" TEXT,
    "vatRate" DECIMAL(5,2),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_requisites_supplierId_idx" ON "supplier_requisites"("supplierId");
CREATE INDEX "supplier_ledger_entries_supplierId_date_idx" ON "supplier_ledger_entries"("supplierId", "date");
CREATE INDEX "supplier_ledger_entries_requisiteId_idx" ON "supplier_ledger_entries"("requisiteId");

-- AddForeignKey
ALTER TABLE "supplier_requisites" ADD FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_ledger_entries" ADD FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_ledger_entries" ADD FOREIGN KEY ("requisiteId") REFERENCES "supplier_requisites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_ledger_entries" ADD FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Перенос банковских реквизитов из плоских полей карточки в блоки реквизитов
-- (данные продовой таблицы suppliers не перемещаются — остаётся та же таблица).
INSERT INTO "supplier_requisites" ("id", "supplierId", "name", "bankName", "bankAccount", "bankBik", "isDefault", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."id", 'Основные реквизиты', s."bankName", s."bankAccount", s."bankBik", true, 0, NOW(), NOW()
FROM "suppliers" s
WHERE COALESCE(s."bankName", '') <> ''
   OR COALESCE(s."bankAccount", '') <> ''
   OR COALESCE(s."bankBik", '') <> '';

-- Перенос строк пробной версии расчётов (если данные успели появиться) в новую ведомость.
-- Полностью пустые строки (без суммы и оплаты) не переносим.
INSERT INTO "supplier_ledger_entries" ("id", "supplierId", "date", "documentNo", "amount", "payment", "note", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       r."supplierId",
       COALESCE(to_timestamp(NULLIF(r."date", ''), 'YYYY-MM-DD') AT TIME ZONE 'UTC', date_trunc('day', NOW())),
       r."invoice",
       r."amount",
       r."payment",
       r."note",
       NOW(),
       NOW()
FROM "supplier_settlement_rows" r
WHERE r."amount" IS NOT NULL OR r."payment" IS NOT NULL;

-- Права удалённого ресурса пробной версии «Расчёты с поставщиками».
DELETE FROM "admin_resource_permissions" WHERE "resourceId" = 'admin.crm.supplier-settlements';
DELETE FROM "admin_resource_role_permissions" WHERE "resourceId" = 'admin.crm.supplier-settlements';

-- DropTable: пробная версия расчётов заменена ведомостью supplier_ledger_entries.
DROP TABLE "supplier_settlement_history";
DROP TABLE "supplier_settlement_rows";
