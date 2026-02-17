-- Проверка успешного выполнения миграции UserRole
-- Выполните эти запросы в pgAdmin по очереди.

-- 1) Enum UserRole должен содержать 8 значений (старый MANAGER отсутствует)
SELECT enumlabel AS role_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'UserRole'
ORDER BY e.enumsortorder;
-- Ожидаемый результат: SUPER_ADMIN, ADMIN, CONTENT_MANAGER, MODERATOR, SUPPORT, PARTNER, USER, GUEST (8 строк)

-- 2) Колонка role в users имеет тип UserRole
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role';
-- Ожидаемый результат: role | USER-DEFINED | UserRole

-- 3) Нет пользователей с ролью MANAGER (все должны быть переведены в MODERATOR)
SELECT COUNT(*) AS users_with_old_manager_role FROM "users" WHERE role::text = 'MANAGER';
-- Ожидаемый результат: 0

-- 4) Распределение ролей после миграции
SELECT role::text, COUNT(*) AS cnt FROM "users" GROUP BY role ORDER BY cnt DESC;
-- Должны быть только значения из нового enum (в т.ч. MODERATOR вместо MANAGER)

-- 5) Default для колонки role = USER
SELECT column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role';
-- Ожидаемый результат: 'USER'::"UserRole" (или аналогично)
