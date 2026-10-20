-- План-график ремонта: убираем дубли проектов одного пакета договоров и
-- восстанавливаем устаревшие снимки номеров договоров (номер в пакете менялся
-- после создания проекта, а снимок на проекте не обновлялся).

-- 1) Дубли: у пакета остаётся самый старый действующий проект (обычно
--    автосозданный при подписании), остальные мягко удаляются в корзину.
-- (deleted_at / deleted_by_id — snake_case через @map в schema.prisma.)
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "packageId" ORDER BY "createdAt" ASC, "id" ASC) AS rn,
    COUNT(*) OVER (PARTITION BY "packageId") AS cnt
  FROM "repair_schedule_projects"
  WHERE "packageId" IS NOT NULL AND deleted_at IS NULL
)
UPDATE "repair_schedule_projects" AS p
SET deleted_at = NOW(), deleted_by_id = NULL
FROM ranked AS r
WHERE p."id" = r."id" AND r.cnt > 1 AND r.rn > 1;

-- 2) Номер договора: берём актуальный из formData пакета (приоритет полей —
--    как в customerFromFormData: contractNumber, dogovorNumber, contract.number).
UPDATE "repair_schedule_projects" AS p
SET "contractNumber" = COALESCE(
      NULLIF(TRIM(pkg."formData" ->> 'contractNumber'), ''),
      NULLIF(TRIM(pkg."formData" ->> 'dogovorNumber'), ''),
      NULLIF(TRIM(pkg."formData" #>> '{contract,number}'), '')
    )
FROM "contract_document_packages" AS pkg
WHERE p."packageId" = pkg."id"
  AND p.deleted_at IS NULL
  AND pkg."kind" = 'REPAIR'
  AND COALESCE(
      NULLIF(TRIM(pkg."formData" ->> 'contractNumber'), ''),
      NULLIF(TRIM(pkg."formData" ->> 'dogovorNumber'), ''),
      NULLIF(TRIM(pkg."formData" #>> '{contract,number}'), '')
    ) IS NOT NULL
  AND p."contractNumber" IS DISTINCT FROM COALESCE(
      NULLIF(TRIM(pkg."formData" ->> 'contractNumber'), ''),
      NULLIF(TRIM(pkg."formData" ->> 'dogovorNumber'), ''),
      NULLIF(TRIM(pkg."formData" #>> '{contract,number}'), '')
    );
