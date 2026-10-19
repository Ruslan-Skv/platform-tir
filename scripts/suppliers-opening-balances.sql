-- Сальдо начальные поставщиков — перенос из таблицы «Поставщики» (Google Диск),
-- извлечены из файла от 19.10.2026 (вкладка «Итого», сальдо конечные).
--
-- Применять НА ПРОДЕ ПОСЛЕ деплоя нового раздела и миграции
-- 20261019090000_suppliers_requisites_ledger:
--   psql "$DATABASE_URL" -f scripts/suppliers-opening-balances.sql
--
-- Сопоставление: сначала по ИНН (если извлечён из таблицы), затем по названию
-- (ILIKE — поля могли называться немного иначе в каталоге). Дата сальдо — дата
-- выгрузки таблицы; при более позднем запуске сверьте остатки с актуальной
-- таблицей и поправьте суммы/дату.
--
-- Поставщики с нулевым сальдо (Стоборов, Максидорс, Батова, Фран, Деловые линии,
-- ПЭК, Байкал сервис, Трушев, ТД Века, Конарева, Деревянкин) не трогаем.

BEGIN;

-- Дата фиксации сальдо из таблицы
-- (менять только если переносите сальдо на другую дату)
UPDATE suppliers SET "openingBalanceDate" = TIMESTAMPTZ '2026-10-19 00:00:00' AT TIME ZONE 'UTC'
WHERE "openingBalance" IS NOT NULL OR "openingBalanceDate" IS NOT NULL;

-- 1. ИП Тугушев — 4 800 (ИНН из таблицы: 519031085770)
UPDATE suppliers
SET "openingBalance" = 4800.00, "openingBalanceDate" = TIMESTAMPTZ '2026-10-19 00:00:00' AT TIME ZONE 'UTC'
WHERE "inn" = '519031085770'
   OR "legalName" ILIKE '%тугушев%';

-- 2. ФИС (жалюзи форум) — 83 061,40
UPDATE suppliers
SET "openingBalance" = 83061.40, "openingBalanceDate" = TIMESTAMPTZ '2026-10-19 00:00:00' AT TIME ZONE 'UTC'
WHERE "legalName" ILIKE '%ФИС%' OR "commercialName" ILIKE '%ФИС%'
   OR "legalName" ILIKE '%жалюзи%форум%' OR "commercialName" ILIKE '%жалюзи%форум%';

-- 3. ИП Ничепорович (в таблице «Нечепорович») — −532 512,40 (переплата)
--    Внимание: в итоговой формуле «Итого» таблицы этот поставщик был исключён,
--    но фактическое сальдо именно такое — переносим как есть.
UPDATE suppliers
SET "openingBalance" = -532512.40, "openingBalanceDate" = TIMESTAMPTZ '2026-10-19 00:00:00' AT TIME ZONE 'UTC'
WHERE "legalName" ILIKE '%ничет%порович%' OR "legalName" ILIKE '%ничепорович%'
   OR "commercialName" ILIKE '%ниче%порович%';

-- 4. Вудэко (Гудвин, Ариес) — −745,83 (переплата)
UPDATE suppliers
SET "openingBalance" = -745.83, "openingBalanceDate" = TIMESTAMPTZ '2026-10-19 00:00:00' AT TIME ZONE 'UTC'
WHERE "legalName" ILIKE '%вудэко%' OR "commercialName" ILIKE '%вудэко%'
   OR "legalName" ILIKE '%гудвин%' OR "commercialName" ILIKE '%гудвин%';

-- 5. Стройком — 84 742
UPDATE suppliers
SET "openingBalance" = 84742.00, "openingBalanceDate" = TIMESTAMPTZ '2026-10-19 00:00:00' AT TIME ZONE 'UTC'
WHERE "legalName" ILIKE '%стройком%' OR "commercialName" ILIKE '%стройком%';

COMMIT;

-- Контроль после применения: должно быть 5 строк, «Итого к оплате» = 172 145,17
-- (4 800 + 83 061,40 − 532 512,40 − 745,83 + 84 742, без учёта новых записей).
SELECT "legalName", "commercialName", "inn", "openingBalance", "openingBalanceDate"
FROM suppliers
WHERE "openingBalance" IS NOT NULL
ORDER BY "openingBalance" DESC;
