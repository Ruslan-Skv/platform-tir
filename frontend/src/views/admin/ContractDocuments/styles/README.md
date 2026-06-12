# Стили «Оформление договоров»

Руководство по организации CSS в модуле `ContractDocuments`. Используется **гибридная модель**: общие стили — в `styles/`, локальные — рядом с компонентом (co-location). Это соответствует современной практике CSS Modules в крупных feature-модулях.

## Два уровня стилей

| Уровень             | Где лежит                                              | Когда использовать                                                              |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Shared partials** | `ContractDocuments/styles/*.module.css`                | Паттерны зоны UI, переиспользуемые классы, составные селекторы, тёмная тема     |
| **Co-located**      | `ComponentName.module.css` рядом с `ComponentName.tsx` | Стили только этого компонента (или пары соседних файлов), нигде больше не нужны |

Оба уровня — CSS Modules (`.module.css`). Не смешивать с глобальными классами, кроме явных `:global(...)`.

### Когда shared partial

- Класс используется в **двух и более** несвязанных компонентах (pages, platform, families).
- Нужен **составной селектор** вида `.pageRoot .header .title` — родитель и потомки должны жить в **одном** `.module.css`.
- Общий layout зоны: список договоров, редактор, библиотека шаблонов, превью документов.
- Тёмная тема для группы связанных элементов.

### Когда co-location

Все условия одновременно:

1. Стили нужны **только** в этом компоненте (или в `component.tsx` + `componentUi.tsx` рядом).
2. Нет селекторов, завязанных на hashed-классы из **другого** CSS Module.
3. Не планируется переиспользование в другой зоне модуля.

Примеры в проекте:

- `packages/platform/editor/dataTab/PackageDataTab.module.css`
- `packages/platform/hub/hubModal/PackageHubModal.module.css`
- `packages/platform/hub/workOrders/PackageWorkOrdersHubModal.module.css`
- `packages/platform/hub/events/PackageEventsJournalModal.module.css`
- `packages/platform/editor/estimateTab/PackageEstimateAttach.module.css`

При рефакторинге новые секции получают co-located CSS, если стили локальны. Массовый перенос из `styles/` не делаем — только по мере касания файлов.

## Shared partials (каталог)

| Файл                              | Зона UI                                             |
| --------------------------------- | --------------------------------------------------- |
| `base.module.css`                 | `.page`, общие переменные, print                    |
| `contracts-list-hub.module.css`   | Хаб, списки договоров, settings layout, справочники |
| `estimates-list.module.css`       | Список расчётов                                     |
| `estimates-workspace.module.css`  | Рабочая область расчётов                            |
| `editor-chrome.module.css`        | Шапка редактора, tab bar, кнопки                    |
| `data-tab.module.css`             | Вкладка «Данные»                                    |
| `estimate-tab.module.css`         | Вкладка сметы                                       |
| `templates-library.module.css`    | Библиотека шаблонов                                 |
| `documents-preview.module.css`    | Превью и печать документов                          |
| `product-package.module.css`      | PRODUCT_LIKE: окна, двери, …                        |
| `hub-modals.module.css`           | Общие паттерны hub-модалок                          |
| `interactive-estimate.module.css` | Интерактивная смета                                 |

Тёмная тема — в тех же partial-файлах: `:where(html[data-theme='dark']) { ... }`.

Крупные partials (`documents-preview`, `base`) при необходимости дробят **внутри `styles/`** по подзонам, не перенося в компоненты целиком.

## Импорт

### Предпочтительно: алиас `@/`

Стабилен при любой глубине вложенности:

```ts
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
```

### Относительный путь — допустим на мелкой глубине

```ts
// packages/pages/hub/ContractDocumentsHubPage.tsx
import cdBase from '../../../styles/base.module.css';
```

Глубоко вложенные файлы (`hooks/editorFormat/`, `families/`) — только алиас `@/`, чтобы не считать `../`.

### Co-located

```ts
import styles from './PackageDataTab.module.css';

// className={styles.packageDataSectionCardLocked}
```

### Именование импортов

| Тип            | Конвенция               | Пример                                       |
| -------------- | ----------------------- | -------------------------------------------- |
| Shared partial | `cd` + зона (camelCase) | `cdBase`, `cdHub`, `cdTemplates`, `cdChrome` |
| Co-located     | `styles` или имя файла  | `styles`, `hubModalStyles`                   |

Компонент импортирует **только нужные** partial-файлы, не все подряд.

## Композиция классов в TypeScript

Когда один UI-паттерн собирается из нескольких partials, классы склеивают в `*ClassNames.ts` рядом с фичей, а не дублируют в каждом компоненте:

- `packages/platform/ui/packageTabClassNames.ts`
- `packages/families/product-like/addendum/addendumTabClassNames.ts`

```ts
export const PACKAGE_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
```

Новые склейки — в таких файлах, не inline в десятках компонентов.

## Ограничения CSS Modules

### Не делать barrel `@import` между partials

Файл-«бочка» с `@import` всех partials **ломает** составные селекторы: классы из разных файлов получают разные hash, и `.parent .child` перестаёт совпадать.

### Составные селекторы — один файл

Классы из одного составного селектора импортируются из **одного** partial:

```css
/* contracts-list-hub.module.css */
.repairContractsListPage .editorHeader .title { ... }
```

```tsx
className={`${cdHub.repairContractsListPage} ${cdHub.editorHeader}`}
// title тоже из cdHub — не из другого модуля
```

### `:global()` — осознанно

Использовать для стабильных якорей вне CSS Modules (например `.packageDataTabDense` в `PackageDataTab.module.css`), не как обход для связывания разных модулей.

## Структура при рефакторинге страниц

```
packages/pages/settings/
├── ContractDocumentsMarkupSettingsPage.tsx   # shell
├── MarkupSettingsPageView.tsx
├── MarkupSettingsPageView.module.css       # только если стили уникальны для view
└── hooks/useMarkupSettingsPage.ts

styles/contracts-list-hub.module.css        # packageSettingsCard — shared, остаётся здесь
```

Layout карточек settings, хаба, списков — в shared partials. Форма наценки с уникальной вёрсткой — co-located, если не переиспользуется.

## Чеклист для нового стиля

1. Стили понадобятся ещё где-то? → `styles/<зона>.module.css`
2. Только этот компонент? → `ComponentName.module.css` рядом
3. Составной селектор через несколько компонентов? → один shared partial
4. Склейка из 2+ partials? → `*ClassNames.ts`
5. Импорт из `hooks/` или `families/`? → `@/views/admin/ContractDocuments/styles/...`
6. Тёмная тема? → в том же файле, где светлая

## Антипаттерны

- Переносить весь `documents-preview.module.css` (1900+ строк) в один компонент
- Дублировать одни и те же правила в co-located файлах разных страниц
- Barrel `@import` для CSS Modules
- Inline `className` со склейкой 5+ классов из разных partials без `*ClassNames.ts`
- Глобальные стили вне `:global()` без необходимости

## Миграция legacy

Существующие импорты через `../../styles/` менять **не обязательно** — только при рефакторинге затронутого файла. Новый код — алиас `@/` и co-location по чеклисту выше.
