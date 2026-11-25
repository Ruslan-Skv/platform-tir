-- Поставщики колонки «Поставщик» в Спецификации договоров «Двери».
-- Список задаёт супер-админ в «Настройках договоров»; он не зависит от доступа
-- сотрудника к разделу «Поставщики».
ALTER TABLE "contract_document_repair_settings" ADD COLUMN "doorsSpecificationSupplierIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- До этого в спецификации показывались все действующие поставщики — переносим их
-- в список, чтобы после релиза у сотрудника с доступом к разделу ничего не пропало.
-- Неактивные тоже включаем: в спецификации они скрыты, пока их не включат обратно.
INSERT INTO "contract_document_repair_settings" ("kind", "defaultWorkPeriodDays", "doorsSpecificationSupplierIds", "updatedAt")
SELECT
    'DOORS',
    90,
    COALESCE(array_agg("suppliers"."id"), ARRAY[]::TEXT[]),
    CURRENT_TIMESTAMP
FROM "suppliers"
WHERE "suppliers"."deletedAt" IS NULL
ON CONFLICT ("kind") DO UPDATE SET "doorsSpecificationSupplierIds" = EXCLUDED."doorsSpecificationSupplierIds";
