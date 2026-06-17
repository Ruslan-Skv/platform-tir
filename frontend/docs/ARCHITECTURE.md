# Архитектура frontend (Platform TIR)

Документ фиксирует **единые правила** для всего проекта. Мы сознательно **не используем чистый FSD**: изначальный Feature-Sliced Design частично реализован, но основная масса UI живёт в слое `views/`. Цель — **предсказуемая структура**, а не догматичное следование аббревиатуре.

Проверка соблюдения: `npm run check-architecture` (также в `npm run validate` и pre-commit).

---

## Слои и ответственность

```
app/        → маршруты Next.js (тонкие page.tsx, layout, metadata)
views/      → экраны и доменная UI-логика разделов
widgets/    → крупные составные блоки (header, footer, layout)
features/   → переиспользуемые пользовательские сценарии (формы, auth, theme)
entities/   → типы и модели сущностей без UI
shared/     → UI-kit, API-клиенты, утилиты, конфигурация
```

| Слой       | Может импортировать                         |
| ---------- | ------------------------------------------- |
| `shared`   | только `shared`, `entities`                 |
| `entities` | `shared`, `entities`                        |
| `features` | `shared`, `entities`, `features`            |
| `widgets`  | `shared`, `entities`, `features`, `widgets` |
| `views`    | все слои **кроме** `app`                    |
| `app`      | все слои                                    |

**Запрещено:**

- импорт из `app/` в любой другой слой;
- импорт «вверх» по таблице (например, `shared` → `views`);
- бизнес-логика в `app/**/page.tsx` — только роутинг, params, metadata и рендер view.

**Алиасы импортов:** используйте `@/…` (`@/shared/…`, `@/views/…`). Алиасы `@shared/*`, `@views/*` в tsconfig зарезервированы, но в коде предпочтителен единый `@/`.

---

## `app/` — тонкие страницы

```tsx
// ✅ app/admin/contract-documents/contracts/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';

import { PackageDocumentEditorPage } from '@/views/admin/ContractDocuments/packages/pages/PackageDocumentEditorPage';

export default function Page() {
  const id = typeof useParams()?.id === 'string' ? useParams()!.id : '';
  if (!id) return <p>Некорректный идентификатор.</p>;
  return <PackageDocumentEditorPage packageId={id} />;
}
```

В `app/` не размещают: хуки с бизнес-логикой, таблицы, формы, API-вызовы (кроме server components с fetch, если появятся).

---

## `views/` — экраны и домены

Структура по разделам:

```
views/
├── catalog/          # публичный каталог (+ routes/ для RSC-страниц)
├── site/             # публичные экраны вне каталога (auth, profile, favorites, compare)
├── admin/            # админка по подразделам
│   ├── Content/      # контент главной и разделов сайта — по подпапке на раздел
│   │   ├── Blog/     # список постов + форма/редактор
│   │   ├── Hero/, Footer/, Navigation/, …
│   │   └── shared/   # общие UI-блоки раздела (SectionVisibilityCheckbox)
│   └── ContractDocuments/
│       ├── core/     # утилиты без привязки к направлению
│       ├── styles/   # общие CSS partials раздела
│       └── packages/ # см. packages/README.md
└── …
```

В `views/admin/Content/` и крупных доменах вроде `views/admin/Catalog/Products/` не складывать экраны в общий список в корне. Правила:

- **Content:** одна папка = пункт меню (`Blog/`, `Promotions/`, `Home/`, …), общие блоки — `shared/`.
- **Products:** `list/` (журнал), `edit/`, `create/`, `shared/` (форма, секции, модалки, утилиты). Публичный API — `Products/index.ts`.
- **Knowledge:** `territory/` (список), `materials/` (просмотр), `materials/form/`, `shared/` (вложения, плеер, утилиты). API — `Knowledge/index.ts`.
- **Settings:** подпапки по разделам настроек (`catalog/`, `forms/`, `roles/`, …), `shared/` (`SettingsSubPageView`, `SettingsPage.module.css`, `rolesConfig`), `hub/` (обзорная страница). API — `Settings/index.ts`.

Лимит check-architecture: не более 25 `.ts`/`.tsx` в одной папке.

### Паттерн страницы (обязателен для новых и при рефакторинге крупных экранов)

| Файл             | Роль                                          |
| ---------------- | --------------------------------------------- |
| `*Page.tsx`      | Тонкая оболочка: вызывает хук, рендерит View  |
| `use*Page.ts(x)` | Состояние, эффекты, обработчики, derived data |
| `*PageView.tsx`  | Презентационный компонент                     |
| `*Section.tsx`   | Крупные секции view (`Pick<Props, …>`)        |

### Именование

- Хуки: `useCamelCase`
- Компоненты: `PascalCase`
- Утилиты/константы: `camelCase` / `SCREAMING_SNAKE` для констант
- Стили: co-located `*.module.css` + общие partials в `styles/` раздела

---

## `shared/`, `features/`, `widgets/`

- **`shared/ui`** — атомарные и молекулярные компоненты без знания о бизнес-разделах.
- **`shared/api`** — HTTP-клиенты. Типы ответов API — в `shared/types` или `entities/`, **не** в `views/`.
- **`features/`** — сценарии, которые используются в нескольких разделах (формы обратной связи, auth).
- **`widgets/`** — композиция для layout (header, sidebar). Не тянут логику из `views/` (исключения задокументированы в allowlist до рефакторинга).

---

## Крупные модули: ContractDocuments/packages

Для сложных подсистем действуют дополнительные правила (см. `packages/README.md`):

```
packages/
├── config/       — реестры, маршруты
├── platform/     — универсальный код редактора
│   ├── editor/   — public API: editor/index.ts
│   ├── hub/      — public API: hub/index.ts
│   ├── hooks/    — хуки уровня пакета (подпапки по домену, barrel: hooks/index.ts)
│   └── …
├── families/     — различия семейств комплектов
├── pages/        — экраны раздела
└── templates/
```

**Группировка файлов:**

- В корне `platform/editor/` и `platform/hub/` — **только** `index.ts`.
- Исходники — в подпапках по смыслу (`chrome/`, `payments/`, `pipeline/`, …).
- Между подпапками `editor/` и `hub/` — импорт через `index.ts` или явный относительный путь `../payments/…`, не через корень.
- В подпапках **нет** barrel-файлов (`index.ts` для re-export) — публичный API только на уровне `editor/index.ts`, `hub/index.ts`, `packages/index.ts`.

**Лимит файлов в одной директории:** ≤ 25 `.ts`/`.tsx` (без тестов). При превышении — выделить подпапку по домену.

---

## Импорты

1. **Между слоями** — только через `@/layer/…`.
2. **Внутри модуля** — относительные пути (`./`, `../`).
3. **Глубина** `../` — не более 3 уровней от текущего файла; при большей глубине — вынести в barrel или сократить путь через `@/`.
4. **CSS Modules** — импорт только для стилей; типы и компоненты — из `.tsx`, не из `.module.css`.

---

## Стили

Единый подход: **CSS Modules** (`.module.css`) + глобальные токены в `app/globals.css`. SCSS, Tailwind и CSS-in-JS **не используем**.

### Стек

| Технология      | Решение                                                              |
| --------------- | -------------------------------------------------------------------- |
| Компоненты      | Co-located `Component.module.css` рядом с `Component.tsx`            |
| Глобал          | Только `app/globals.css` — design tokens (`:root`), шрифты, reset    |
| Крупный feature | Hybrid: `styles/*.module.css` (shared partials) + co-located modules |
| SCSS            | Не вводим — tokens в CSS variables                                   |
| Tailwind        | Не используем                                                        |

### Co-location (по умолчанию)

```tsx
// views/admin/Orders/list/OrdersPageView.tsx
import styles from './OrdersPage.module.css';

export function OrdersPageView() {
  return <div className={styles.page}>…</div>;
}
```

Один компонент — один `.module.css` в той же папке. Импорт типов и компонентов из `.module.css` запрещён (только default import классов).

### Глобальные стили

`app/globals.css` — единственный plain CSS. Подключается **только** из `app/layout.tsx`:

```tsx
import './globals.css';
```

Сюда: CSS variables (`--admin-*`, `--color-*`), `@font-face`, базовый reset. Не добавлять page-specific правила.

### Крупные модули (hybrid)

Для feature вроде `ContractDocuments` — shared partials в `styles/` + локальные modules у компонентов. Подробно: [`views/admin/ContractDocuments/styles/README.md`](../src/views/admin/ContractDocuments/styles/README.md).

Импорт shared partials — предпочтительно через алиас:

```tsx
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
```

Co-located пример:

```tsx
import styles from './PackageHubModal.module.css';
```

### Inline `style={{}}`

| Можно                                                     | Нельзя                                                |
| --------------------------------------------------------- | ----------------------------------------------------- |
| Динамика: `transform`, `width: '${pct}%'`, цвета графиков | Layout: `display`, `flex`, `gap`, `margin`, `padding` |
| Позиционирование tooltip/popover от JS                    | Статичные размеры и отступы                           |
| Toast/статус с runtime-цветом                             | Дублирование того, что есть в module                  |

Layout и spacing — в `.module.css`. Inline допустим для значений, вычисляемых в runtime.

### `app/` — без UI и стилей

`app/**/page.tsx` — тонкий shell: params, metadata, re-export route или рендер view из `views/`. Без разметки секций, без `style={{}}`, без импорта `.module.css`.

```tsx
// ✅ app/admin/settings/page.tsx
import { SettingsHubPageView } from '@/views/admin/Settings/hub/SettingsHubPageView';

export default function Page() {
  return <SettingsHubPageView />;
}
```

```tsx
// ✅ app/(site)/catalog/products/page.tsx — RSC-логика в views/*/routes/
export {
  default,
  generateAllProductsMetadata as generateMetadata,
} from '@/views/catalog/routes/all-products-page-route';
```

```tsx
// ✅ app/(site)/login/page.tsx — клиентский UI в views/site/
import { LoginPageView } from '@/views/site/auth/LoginPageView';

export default function LoginPage() {
  return <LoginPageView />;
}
```

### Антипаттерны

- Plain CSS (`import './foo.css'`) вне `app/layout.tsx`
- Tailwind-классы или `@tailwind` directives
- Page-specific стили в `globals.css`
- Импорт `.module.css` из `app/**/page.tsx` (выносить в view)
- Barrel `@import` между CSS Modules (ломает составные селекторы)

### Миграция legacy (стили)

**Статус: основная миграция завершена** — `npm run check-architecture` проходит без предупреждений по CSS-правилам.

Что сделано:

| Область           | Результат                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack             | CSS Modules + `globals.css`; Tailwind удалён из deps                                                                                                           |
| Проверки          | 4 CSS-правила в `check-architecture` (plain CSS, inline layout, co-location, app pages)                                                                        |
| Admin inline      | `*PageView` / `*Section*` — layout/spacing в `.module.css`; динамика — helper-компоненты (`IndentedBlock`, `VideoProgressFill`, `SpreadsheetTableViewport`, …) |
| `app/**/page.tsx` | UI и `.module.css` вынесены в `views/`; RSC-страницы — в `views/*/routes/`                                                                                     |
| Site pages        | `views/site/` — auth, profile, favorites, compare                                                                                                              |

Паттерны выноса:

- **Клиентская страница** → `views/site/<feature>/*PageView.tsx` + co-located `.module.css`; shell в `app/` — 4–5 строк.
- **Server route (каталог, блог, товар)** → `views/<domain>/routes/*-page-route.tsx` с `generate*Metadata`; shell — re-export.
- **Runtime inline** → отдельный компонент **вне** `*PageView`/`*Section*` в той же feature-папке или `shared/ui/`.

Оставшийся техдолг по стилям: **нет** — allowlist `app-page-with-styles` очищен. Settings используют `SettingsSubPageView`; site checkout/order — `views/site/`; delivery/admin-link/checkout — `views/admin/Settings/*/`.

---

## Тесты

- Unit: `*.test.ts` рядом с модулем или в `__tests__/`.
- E2E: `frontend/playwright/`.
- Тестовые файлы не учитываются в лимите файлов на директорию.

---

## Миграция и техдолг

Нарушения границ слоёв фиксируются в `scripts/architecture.config.mjs` → `allowlist` (пуст). Новые нарушения **не добавлять** — выносить типы в `shared/types` или `entities/`.

Закрытые пункты миграции (актуально на текущий момент):

1. ~~`CatalogApiProduct` и mapper — в `shared/types/catalog` и `shared/lib/catalog/`.~~ ✅
2. ~~`platform/hooks/` сгруппированы по доменам~~ (`document/`, `editor/`, `contract/`, `estimate/`, `questionnaire/`, `work-orders/`, `addendum/`, `data-tab/`, `template/`, `profile/`, `product-spec/`); публичный API — `platform/hooks/index.ts`.
3. ~~Повторяющиеся доменные модели в `entities/`~~ — `entities/product` (`Product`, `ProductForCopy`, …).
4. ~~Крупные экраны админки и витрины~~ — shell + `use*Page` + `*PageView` (см. список в истории коммитов; формы товара — `sections/`).
5. ~~Стилизация: CSS Modules, architecture checks, inline → modules, app pages → views, allowlist очищен~~ ✅

Новые крупные `*Page.tsx` (> ~250 строк) сразу раскладывать по паттерну shell + hook + view. Недавно: `CategoryEditPage`, `AccountingInvoicesPage`, `PartnerEditPage`, `KnowledgeMaterialFormPage`, `InstallersPage`, `SupplierEditPage`, `OfficesPage`, `PartnersPage`, `PhotoProjectFormPage`, `PhotoSectionPage`, `OrdersPage`, `OrderCheckoutInfoPage` (статическая документация — shell + view + constants), `OrderDetailPage`, `ServiceOrdersPage`, `ServiceOrderDetailPage`, `OrdersShippingPage`; site: auth, profile, compare, favorites; catalog/blog/product routes.

---

## Автоматическая проверка

Скрипт `scripts/check-architecture.mjs` + конфиг `scripts/architecture.config.mjs`.

| Проверка                                               | Уровень                                               |
| ------------------------------------------------------ | ----------------------------------------------------- |
| Границы слоёв (импорты)                                | error                                                 |
| Лишние файлы в корне `platform/editor`, `platform/hub` | error                                                 |
| > 25 `.ts`/`.tsx` в одной папке                        | error (с overrides для `shared/api`, `shared/lib`, …) |
| Плоский корень `views/admin/**` (> 6 `.ts`/`.tsx`)     | error — группировка list/edit/shared + `index.ts`     |
| Домен с подпапками без `index.ts` в корне              | warn — лишние файлы рядом с `Blog/`, `list/`, …       |
| Толстый shell `views/**/*Page.tsx`                     | warn (> 80 строк, не `*PageView`)                     |
| Крупный `views/**/*Page.tsx`                           | warn (> 250 строк — нужна декомпозиция)               |
| Толстые `app/admin/contract-documents/**/page.tsx`     | error (> 80 строк)                                    |
| Импорт типов из `*.module.css`                         | error                                                 |
| Plain CSS import (не `.module.css`) в `src/**`         | error (allowlist: `app/layout.tsx` → `globals.css`)   |
| Inline layout в `*PageView.tsx` / `*Section*.tsx`      | warn (allowlist: ContractDocuments, tooltips, charts) |
| `.module.css` не co-located и не в `styles/`/`shared/` | warn                                                  |
| `app/**/page.tsx` со стилями или толстой разметкой     | warn (> ~40 строк, inline, import `.module.css`)      |
| Известный техдолг из allowlist                         | warn (сводка, не блокирует)                           |

Нарушения **группируются по категории** — в одном прогоне видны все похожие директории. Полный отчёт: `npm run check-architecture -- --audit`. Глубокие импорты: `--verbose`.

Новые нарушения allowlist **не добавлять** — исправлять архитектуру.

## Pre-commit (монорепозиторий)

Проверки при коммите общие для backend и frontend: hook `backend/.husky/pre-commit`.

1. **lint-staged** (`.lintstagedrc.cjs` в корне) — на **staged**-файлах: prettier, eslint, **secretlint** (backend + frontend `*.{ts,tsx,js,jsx}` и др. по конфигу); json/md/css — prettier (+ secretlint где уместно). Полный `eslint src` / `prettier --check .` по всему frontend **не** гоняется на каждый commit (долго); это — `npm run validate`.
2. **backend** — `validate:precommit` (type-check, lint, format:check, architecture по всему backend).
3. **frontend** — `validate:precommit` (type-check, architecture по всему frontend).

**secretlint:** в pre-commit только на **staged**-файлах (шаг lint-staged). Полный скан `src/` — `npm run secretlint` или `cd backend && npm run validate:monorepo` (backend + frontend). Полный `npm run validate` frontend — вручную / CI.

Коммит: `npm run commit` (из любого пакета). Ручная проверка без коммита: `cd backend && npm run validate:monorepo`.

## Связанные команды

```bash
npm run check-architecture   # проверка архитектуры
npm run secretlint           # полный скан секретов (preset-recommend); в pre-commit — только staged через lint-staged
npm run validate             # type-check + lint + format + architecture
npm run commit               # git add + cz → backend/.husky/pre-commit
```
