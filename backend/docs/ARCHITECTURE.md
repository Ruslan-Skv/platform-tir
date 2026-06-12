# Архитектура backend (Platform TIR)

NestJS 10 + Prisma + PostgreSQL. Документ описывает **единые правила** структуры `src/`. Проверка: `npm run check-architecture`.

---

## Зоны (слои)

Проект не FSD — используется **модульная архитектура NestJS** с явными зонами:

```
bootstrap/          main.ts, app.module.ts
infrastructure/     common/, database/, elasticsearch/
core/               auth/, users/
public/             публичные и «сайтовые» модули в корне src/
admin/              admin/** — CRM, CMS, каталог (админ), аналитика
```

| Зона             | Пути                                                              | Может импортировать                         |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| `infrastructure` | `common/`, `database/`, `elasticsearch/`                          | только `infrastructure`                     |
| `core`           | `auth/`, `users/`                                                 | `infrastructure`, `core`                    |
| `public`         | остальные модули в `src/` (products, orders, hero, …)             | `infrastructure`, `core`, `public`          |
| `admin`          | `admin/**`                                                        | `infrastructure`, `core`, `public`, `admin` |
| `bootstrap`      | `main.ts`, `app.module.ts`, `app.controller.ts`, `app.service.ts` | все зоны                                    |

**Запрещено:**

- `public` → `admin` (единственная точка входа в админку — `AppModule` импортирует `AdminModule`)
- `infrastructure` → любые доменные модули
- `core` → `public` / `admin`

---

## Структура feature-модуля

Каждый домен — **NestJS module** в своей папке:

```
feature-name/
├── feature-name.module.ts      # обязателен
├── feature-name.controller.ts  # HTTP-слой
├── feature-name.service.ts     # бизнес-логика + Prisma
├── feature-name.controller.spec.ts
├── dto/                        # class-validator DTO
│   ├── create-*.dto.ts
│   └── update-*.dto.ts
└── *.ts                        # утилиты, константы, include-файлы
```

### Controller

- Только маршрутизация, guards, pipes, вызов service.
- **Не инжектить `PrismaService` напрямую** — только через service (исключения в allowlist до рефакторинга).
- Публичные эндпоинты админ-модуля: `*-public.controller.ts` (например `blog-public.controller.ts`).
- Guards: `JwtAuthGuard` + `RolesGuard` + `@Roles(...)` для admin API.

### Service

- Вся работа с БД (`PrismaService`), транзакции, доменная логика.
- Крупный service (> ~500 строк) — сигнал к декомпозиции на под-сервисы (как в `contract-document-packages`: payments, invoices).

### DTO

- В папке `dto/`, имена `create-*.dto.ts`, `update-*.dto.ts`, `set-*.dto.ts`.
- `class-validator` + `class-transformer`; без бизнес-логики.

### Module

- `imports`: только другие `*Module`, не прямые импорты чужих `*.service.ts` в providers без модуля.
- `exports`: только то, что реально нужно соседним модулям.

---

## Admin (`src/admin/`)

Агрегатор: `admin.module.ts` импортирует подмодули. Группы:

| Группа             | Примеры                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| CRM                | customers, measurements, contracts, tasks, installers                    |
| CMS                | blog, pages, photo, knowledge, promotions                                |
| Catalog (admin)    | `admin/catalog/*`, suppliers, partners                                   |
| Orders             | admin/orders                                                             |
| Contract documents | contract-document-packages, contract-document-objects, contract-payments |
| System             | admin-access, admin-presence, notifications, analytics                   |

**Перекрёстные зависимости admin:** через `imports: [OtherModule]` и `exports: [OtherService]`, не через глубокие относительные пути к чужим файлам без module wiring.

**Вложенные домены:** `admin/catalog/manufacturers/` — полноценный подмодуль со своим `*.module.ts`.

---

## Крупные модули

Для `contract-document-packages` и аналогов:

```
contract-document-packages/
├── contract-document-packages.module.ts
├── contract-document-packages.controller.ts   # тонкий, делегирует
├── contract-document-packages.service.ts      # основной CRUD / пакеты
├── contract-document-package-payments.service.ts
├── contract-document-payment-invoices.service.ts
├── contract-package.include.ts                # Prisma includes
├── dto/                                       # все DTO
└── *.ts                                       # утилиты (без dto/)
```

- В **корне модуля** (без `dto/`) — не более **12** `.ts`-файлов; при росте — выделять `services/`, `utils/`.
- Новый код в `dto/` — не в корне.

---

## Prisma и БД

- `PrismaService` — только в `database/` и в **services** (не controllers).
- Общие `include`/`select` — отдельные файлы (`*.include.ts`).
- Миграции — только `prisma/migrations/`; не править историю применённых миграций.
- Seed — `prisma/seed.ts` и именованные `prisma/seed-*.ts`.

---

## Импорты

1. Относительные пути внутри модуля (`./`, `../sibling/`).
2. К `common/`, `auth/`, `database/` — относительно глубины (`../../common/...` из admin).
3. Алиас `@/` в tsconfig есть, но в коде пока преобладают относительные пути — **допустимы оба**, главное — соблюдение зон.
4. Глубина `../` > 4 — повод вынести shared-утилиту в `common/` или сократить путь.

---

## Публичное vs админ API

| Тип                          | Расположение                      | Префикс маршрута     |
| ---------------------------- | --------------------------------- | -------------------- |
| Сайт / кабинет               | `src/products/`, `src/orders/`, … | `/api/v1/...`        |
| Админка                      | `src/admin/**`                    | `/api/v1/admin/...`  |
| Публичные куски админ-домена | `*-public.controller.ts`          | по соглашению модуля |

---

## Тесты

- Unit: `*.spec.ts` рядом с файлом.
- E2E: `test/`.
- В лимиты файлов на директорию тесты не входят.

---

## Автоматическая проверка

`scripts/check-architecture.mjs` + `scripts/architecture.config.mjs`.

| Проверка                                         | Уровень                      |
| ------------------------------------------------ | ---------------------------- |
| Импорты между зонами                             | error                        |
| `PrismaService` в `*.controller.ts`              | error (allowlist для legacy) |
| > 12 `.ts` в корне feature-модуля (кроме `dto/`) | error                        |
| > 15 `.ts` в `dto/` одного модуля                | warn                         |
| Service > 600 строк                              | warn (allowlist для legacy)  |

---

## Техдолг

`allowlist` в `scripts/architecture.config.mjs` пуст — известных нарушений нет.

Ранее зафиксированный техдолг закрыт:

- ~~Крупные god-services~~ — разбиты на под-сервисы (`admin-orders-*`, `products-*`, `contract-document-package-*`, …); все `.service.ts` ≤ 600 строк.
- ~~`PrismaService` в controllers~~ — логика БД только в services.

При росте нового service > ~500 строк — сразу выделять под-сервисы по поддомену (`services/` или отдельные `*-*.service.ts`).

---

## Pre-commit (монорепозиторий)

Единый hook для всего репозитория: `backend/.husky/pre-commit` (`git config core.hooksPath` → `backend/.husky`).

| Этап                        | Что делает                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| lint-staged                 | Prettier · ESLint · secretlint на staged code (backend + frontend); json/md/css — prettier (+ secretlint) |
| backend validate            | `type-check`, `lint`, `format:check`, `check-architecture`, `prisma generate` (весь backend)              |
| backend secretlint          | Полный скан секретов (`src/`, `prisma/`, корневые `*.{js,json}`)                                          |
| frontend validate:precommit | `type-check`, `check-architecture` (весь frontend; eslint/format — lint-staged на staged)                 |
| frontend secretlint         | Полный скан секретов (`src/`, `scripts/`, корневые `*.{js,json,mjs}`)                                     |

Конфиг lint-staged: `.lintstagedrc.cjs` в корне. Команды идут через `scripts/lint-staged-workspace.js` — runner переключает cwd в `backend/` или `frontend/`, иначе Prettier не находит workspace-плагины (например `@trivago/prettier-plugin-sort-imports` во frontend).

Коммит: `npm run commit` из `backend/` или `frontend/` (git add всего репо + Commitizen). Husky после клона: `cd backend && npm run husky:install`.

---

## Команды

```bash
npm run check-architecture
npm run validate          # + type-check, lint, format, prisma generate
npm run commit            # git add + cz; проверки — backend/.husky/pre-commit
npm run validate:monorepo # ручная проверка backend + frontend без коммита
```
