# Миграция: менеджер обработки заказа

Добавляет хранение ФИО покупателя в заказе и фиксирует менеджера, обработавшего заказ.

## Применение

```bash
cd backend
psql $DATABASE_URL -f prisma/migrations_archive/20260220_manager_order_processing/migration.sql
npx prisma generate
```
