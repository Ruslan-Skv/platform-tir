# Миграция: иерархия ролей UserRole

Эта миграция заменяет enum `UserRole` на новую иерархию из 8 ролей.
Существующая роль `MANAGER` маппится на `MODERATOR`.

## Ошибка P3005 (database schema is not empty)

Если при `npx prisma migrate deploy` появляется **P3005**, значит база уже была создана без Prisma Migrate (например, через `db push` или вручную). Нужно применить миграцию вручную и пометить её как применённую.

### Шаги

**1. Выполните SQL в PostgreSQL**

Скопируйте содержимое `migration.sql` и выполните в вашей БД (pgAdmin, DBeaver, psql и т.п.), либо из корня backend:

```bash
# если установлен psql и DATABASE_URL в .env:
cd prisma/migrations/20260129_user_role_hierarchy
psql %DATABASE_URL% -f migration.sql
# или в PowerShell:
# $env:PGPASSWORD='...'; psql -h localhost -U postgres -d territory -f migration.sql
```

**2. Отметьте миграцию как применённую**

Из папки `backend`:

```bash
npx prisma migrate resolve --applied 20260129_user_role_hierarchy
```

**3. Регенерируйте Prisma Client**

```bash
npx prisma generate
```

После этого схема и клиент будут соответствовать новой иерархии ролей.
