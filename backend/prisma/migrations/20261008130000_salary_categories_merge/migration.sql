-- Направления расчёта з/п:
--  «Двери + потолки» → «Двери» + отдельное направление «Потолки»;
--  «Ремонт» и «Ремонт 50/50» объединены в «Ремонт» (сплит 50/50 — как у существующих
--  договоров «Ремонт 50/50», чтобы их расчёт не поменялся);
--  «Аврора» удалена (договоров не было).

UPDATE "salary_categories" SET "code" = 'DOORS', "name" = 'Двери' WHERE "code" = 'DOORS_CEILINGS';

INSERT INTO "salary_categories" (
  "id", "code", "name", "vsPercent", "splitSign", "splitClose",
  "managerPercent", "surveyorPercent", "brigadierPercent", "isActive", "sortOrder",
  "createdAt", "updatedAt"
) VALUES (
  'salary_cat_ceilings', 'CEILINGS', 'Потолки', 2, 0.7, 0.3,
  3, 3, 0, true, 25,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

UPDATE "salary_categories" SET "splitSign" = 0.5, "splitClose" = 0.5 WHERE "code" = 'REPAIR';

UPDATE "salary_contracts"
SET "categoryId" = (SELECT "id" FROM "salary_categories" WHERE "code" = 'REPAIR')
WHERE "categoryId" = (SELECT "id" FROM "salary_categories" WHERE "code" = 'REPAIR_5050');

UPDATE "salary_rate_rules"
SET "categoryId" = (SELECT "id" FROM "salary_categories" WHERE "code" = 'REPAIR')
WHERE "categoryId" = (SELECT "id" FROM "salary_categories" WHERE "code" = 'REPAIR_5050');

DELETE FROM "salary_categories" WHERE "code" = 'REPAIR_5050';
DELETE FROM "salary_categories" WHERE "code" = 'AURORA';
