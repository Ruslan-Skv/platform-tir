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
├── catalog/          # публичный каталог
├── admin/            # админка по подразделам
│   └── ContractDocuments/
│       ├── core/     # утилиты без привязки к направлению
│       ├── styles/   # общие CSS partials раздела
│       └── packages/ # см. packages/README.md
└── …
```

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

Новые крупные `*Page.tsx` (> ~250 строк) сразу раскладывать по паттерну shell + hook + view. Недавно: `CategoryEditPage`, `AccountingInvoicesPage`, `PartnerEditPage`, `KnowledgeMaterialFormPage`.

---

## Автоматическая проверка

Скрипт `scripts/check-architecture.mjs` + конфиг `scripts/architecture.config.mjs`.

| Проверка                                               | Уровень                                                |
| ------------------------------------------------------ | ------------------------------------------------------ |
| Границы слоёв (импорты)                                | error                                                  |
| Лишние файлы в корне `platform/editor`, `platform/hub` | error                                                  |
| > 25 `.ts`/`.tsx` в одной папке                        | error (с overrides для `shared/api`, `platform/hooks`) |
| Толстые `app/admin/contract-documents/**/page.tsx`     | error (> 80 строк)                                     |
| Импорт типов из `*.module.css`                         | error                                                  |
| Известный техдолг из allowlist                         | warn (сводка, не блокирует)                            |

Новые нарушения allowlist **не добавлять** — исправлять архитектуру. Подробный вывод: `node scripts/check-architecture.mjs --verbose`.

## Связанные команды

```bash
npm run check-architecture   # проверка архитектуры
npm run validate             # type-check + lint + format + architecture
npm run commit               # commitizen (pre-commit запускает проверки через husky)
```
