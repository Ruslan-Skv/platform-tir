-- Досев направлений расчёта з/п по умолчанию (идемпотентно, по коду).
-- На базах, где раздел разворачивался с нуля (прод), categories_merge создала
-- только «Потолки», ensureDefaults() сеет направления лишь в пустую таблицу
-- и уже не сработал — синхронизация з/п пропускала договоры всех остальных видов.

INSERT INTO "salary_categories" (
  "id", "code", "name", "vsPercent", "splitSign", "splitClose",
  "managerPercent", "surveyorPercent", "brigadierPercent", "isActive", "sortOrder",
  "createdAt", "updatedAt"
) VALUES
  (gen_random_uuid(), 'WINDOWS', 'Окна', 1.5, 0.7, 0.3, 3, 3, 0, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DOORS', 'Двери', 2, 0.7, 0.3, 3, 3, 0, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CEILINGS', 'Потолки', 2, 0.7, 0.3, 3, 3, 0, true, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'BLINDS', 'Жалюзи', 2, 0.7, 0.3, 3, 3, 0, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REPAIR', 'Ремонт', 1, 0.5, 0.5, 5, 0, 8.5, true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'FURNITURE', 'Мебель', 2, 0.7, 0.3, 2, 0, 0, true, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
