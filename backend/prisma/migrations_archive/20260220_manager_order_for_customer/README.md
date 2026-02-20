# Миграция: заказ для покупателя от менеджера

Добавляет возможность менеджеру оформить заказ для покупателя по email и отправить его на почту.

## Применение

```bash
cd backend
psql $DATABASE_URL -f prisma/migrations_archive/20260220_manager_order_for_customer/migration.sql
npx prisma generate
```

## Переменные окружения

Добавьте в `.env`:

- `SITE_URL` — URL фронтенда (например `https://example.com` или `http://localhost:3000`) для ссылки в письме
- `MAIL_FROM` — адрес отправителя писем (опционально)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — настройки SMTP для отправки писем

Для локальной разработки можно использовать MailHog (порт 1025).
