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

## Структура проекта

```
src/
├── auth/              # Модуль аутентификации
├── users/             # Управление пользователями
├── products/          # Товары
├── categories/        # Категории
├── orders/            # Заказы
├── database/          # Prisma сервис
├── elasticsearch/     # Elasticsearch сервис
├── app.module.ts      # Главный модуль
└── main.ts            # Точка входа
```

## Скрипты

- `npm run start:dev` - запуск в режиме разработки
- `npm run build` - сборка проекта
- `npm run start:prod` - запуск production версии
- `npm run lint` - проверка кода
- `npm run format` - форматирование кода с помощью Prettier
- `npm run format:check` - проверка форматирования
- `npm run type-check` - проверка типов TypeScript
- `npm run validate` - запуск всех проверок (type-check, lint, format:check)
- `npm run commit` - интерактивный коммит с проверками (Commitizen)
- `npm run test` - запуск тестов
- `npm run prisma:generate` - генерация Prisma Client
- `npm run prisma:migrate` - создание миграций
- `npm run prisma:studio` - открыть Prisma Studio

## Pre-commit хуки

Проект настроен с Husky для автоматических проверок перед коммитом:

- **lint-staged** - форматирование и проверка staged файлов
- **TypeScript** - проверка типов
- **Prettier** - проверка форматирования
- **ESLint** - проверка кода
- **Secretlint** - проверка на наличие секретов

Для коммита используйте:
```bash
npm run commit
```

Это запустит все проверки и интерактивный интерфейс Commitizen для создания коммита.

## Лицензия

Private
