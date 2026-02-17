# Миграция: чат поддержки

Создаёт таблицы `support_conversations` и `support_messages` для чата поддержки пользователей.

**Применение:**

1. Выполните SQL из `migration.sql` в PostgreSQL (pgAdmin или `psql`), либо:
   ```bash
   npx prisma migrate deploy
   ```
2. Регенерируйте клиент:
   ```bash
   npx prisma generate
   ```
