# Platform TIR Backend API

Backend API для платформы интерьерных решений на NestJS.

## Технологии

- **NestJS** - фреймворк для Node.js
- **TypeScript** - типизированный JavaScript
- **PostgreSQL** - основная база данных
- **Prisma** - ORM для работы с БД
- **Elasticsearch 8.x** - поисковая система
- **JWT** - аутентификация
- **Swagger** - документация API

## Установка

```bash
# Установка зависимостей
npm install

# Настройка Husky для pre-commit хуков
# Запустите из директории backend:
npm run husky:install

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл с вашими настройками

# Генерация Prisma Client
npm run prisma:generate

# Запуск миграций
npm run prisma:migrate

# Запуск приложения в режиме разработки
npm run start:dev
```

## Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/platform_tir"
JWT_SECRET="your-secret-key"
ELASTICSEARCH_NODE="http://localhost:9200"
```

## База данных

### Миграции

```bash
# Создать новую миграцию
npm run prisma:migrate

# Применить миграции в production
npm run prisma:migrate:deploy

# Открыть Prisma Studio
npm run prisma:studio
```

### Seed данные

```bash
npm run prisma:seed
```

## Elasticsearch

Убедитесь, что Elasticsearch запущен и доступен по адресу, указанному в `.env`.

Для локальной разработки можно использовать Docker:

```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0
```

## API Документация

После запуска приложения, Swagger документация доступна по адресу:

```
http://localhost:3001/api/v1/docs
```

## Архитектура

Правила зон, модулей NestJS и крупных доменов: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

```bash
npm run check-architecture   # проверка (входит в validate и pre-commit)
```

## Структура проекта

```
src/
├── common/            # guards, decorators, filters
├── database/          # Prisma
├── elasticsearch/     # Поиск
├── auth/              # JWT
├── users/             # Пользователи
├── admin/             # Админ API (CRM, CMS, каталог, contract-documents)
├── products/          # Товары, публичный каталог
├── orders/, cart/      # Заказы, корзина
├── hero, footer, …    # Секции сайта
└── main.ts
```

## Скрипты

- `npm run start:dev` - запуск в режиме разработки
- `npm run build` - сборка проекта
- `npm run start:prod` - запуск production версии
- `npm run lint` - проверка кода
- `npm run format` - форматирование кода с помощью Prettier
- `npm run format:check` - проверка форматирования
- `npm run type-check` - проверка типов TypeScript
- `npm run check-architecture` - проверка архитектуры
- `npm run validate` - все проверки (type-check, lint, format, architecture)
- `npm run commit` - интерактивный коммит с проверками (Commitizen)
- `npm run test` - запуск тестов
- `npm run prisma:generate` - генерация Prisma Client
- `npm run prisma:migrate` - создание миграций
- `npm run prisma:studio` - открыть Prisma Studio

## Pre-commit хуки

Единый hook: `backend/.husky/pre-commit` (для всего монорепозитория). Срабатывает при `git commit` / `npm run commit`.

Порядок проверок (без дублирования):

1. **lint-staged** — prettier, eslint, **secretlint на staged**-файлах (backend + frontend); prisma format для `.prisma`. Через `scripts/lint-staged-workspace.js` (cwd = workspace). Secretlint срабатывает только для файлов, попавших в коммит (staged).
2. **backend** — `npm run validate:precommit` (`type-check`, `lint`, `format:check`, `check-architecture`; без `prisma generate`)
3. **frontend** — `npm run validate:precommit` (`type-check`, `check-architecture`; eslint/format по staged — в lint-staged)

Полный `npm run validate` / `npm run secretlint` по всему backend или frontend **на каждый commit не гоняется** (долго). Полный скан секретов — `npm run secretlint` в пакете или `npm run validate:monorepo` из `backend/`.

Коммит из `backend/` или `frontend/`:

```bash
npm run commit
```

Проверки без коммита:

```bash
cd backend && npm run validate:monorepo
```

Установка husky (один раз после клона):

```bash
cd backend && npm run husky:install
```

## Лицензия

Private
