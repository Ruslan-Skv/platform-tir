# Docker

Проект подготовлен к докеризации. Для сборки Next.js 16 используется режим `standalone`.

**Примечание**: Папка `src/pages` переименована в `src/views` для устранения конфликта с Pages Router Next.js. Компоненты страниц импортируются через алиас `@/views/`.

## Быстрый старт

```bash
# Создать .env из примера и при необходимости отредактировать
cp .env.example .env

# Запустить все сервисы
docker compose up -d --build

# Проверить статус
docker compose ps
```

Приложение будет доступно:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **Swagger**: http://localhost:3001/api/v1/docs

## Сервисы

| Сервис        | Порт | Описание                    |
|---------------|------|-----------------------------|
| frontend      | 3000 | Next.js приложение          |
| backend       | 3001 | NestJS API + Prisma         |
| postgres      | 5432 | База данных PostgreSQL      |
| elasticsearch | 9200 | Поисковый движок            |

## Переменные окружения

Основные переменные задаются в `.env` (см. `.env.example`):

- `NEXT_PUBLIC_API_URL` — URL API для фронтенда (используется на этапе сборки)
- `API_BASE_URL` — базовый URL бэкенда для генерации ссылок в письмах и ответах
- `JWT_SECRET` — секрет для JWT (обязательно изменить в production)

## Миграции БД

Миграции Prisma выполняются автоматически при старте backend-контейнера (`prisma migrate deploy`).

**Структура миграций**: используется единая baseline-миграция `20240101_000000_init`, сгенерированная из текущей схемы (`prisma migrate diff`). Предыдущие инкрементальные миграции сохранены в `backend/prisma/migrations_backup/` для справки.

**Важно**: папка `backend/prisma/migrations/` должна содержать актуальные миграции. Если в `.gitignore` исключена эта папка, необходимо закоммитить миграции в репозиторий для Docker-сборки.

## Файлы загрузок

Загруженные файлы (изображения, аватары и т.д.) сохраняются в volume `backend_uploads` и сохраняются при пересоздании контейнеров.

## Разработка

Для разработки с hot-reload используйте стандартные команды без Docker:

```bash
# Запустить только инфраструктуру (postgres, elasticsearch)
docker compose up -d postgres elasticsearch

# Backend и frontend — локально
cd backend && npm run start:dev
cd frontend && npm run dev
```

## Продакшен

Для production рекомендуется:
1. Задать надёжный `JWT_SECRET`
2. Настроить `NEXT_PUBLIC_API_URL` и `API_BASE_URL` на публичные URL
3. Добавить reverse proxy (nginx, traefik) с HTTPS
4. Настроить SMTP для писем (переменные `SMTP_*` в backend)
