-- Назначить роль SUPER_ADMIN существующему пользователю
-- Замените 'your-email@example.com' на email вашего админ-аккаунта.

UPDATE "users"
SET role = 'SUPER_ADMIN'
WHERE email = 'your-email@example.com';

-- Проверить результат (должна вернуться 1 строка):
-- SELECT id, email, role FROM "users" WHERE email = 'your-email@example.com';
