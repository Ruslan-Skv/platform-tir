# Стили «Оформление договоров»

## Редактирование

Меняйте **partial-файлы** в этой папке — это единственный источник стилей:

| Файл                              | Назначение                             |
| --------------------------------- | -------------------------------------- |
| `base.module.css`                 | `.page`, общие переменные, print       |
| `estimates-workspace.module.css`  | Рабочая область расчётов               |
| `contracts-list-hub.module.css`   | Список договоров, хаб                  |
| `editor-chrome.module.css`        | Шапка редактора, кнопки                |
| `windows-package.module.css`      | Пакет «Окна» / продуктовые направления |
| `data-tab.module.css`             | Вкладка «Данные»                       |
| `templates-library.module.css`    | Библиотека шаблонов                    |
| `estimate-tab.module.css`         | Вкладка сметы                          |
| `documents-preview.module.css`    | Превью документов                      |
| `hub-modals.module.css`           | Модалки hub                            |
| `estimates-list.module.css`       | Список расчётов                        |
| `interactive-estimate.module.css` | Интерактивная смета                    |

Тёмная тема встроена в те же partial-файлы (блоки `:where(html[data-theme='dark'])`).

## Импорт в компонентах

Каждый компонент импортирует только нужные partial-файлы с алиасами:

```ts
import cdBase from '../../styles/base.module.css';
import cdHub from '../../styles/contracts-list-hub.module.css';

// className={cdHub.repairContractsListPage}
```

## Почему не `@import` barrel

Barrel с `@import` ломает составные селекторы в CSS Modules (`.repairContractsListPage .editorHeader .title`), потому что классы из разных partial-файлов получают разные hash.

**Важно:** классы из одного составного селектора должны импортироваться из **одного** partial-файла. Пример для списка договоров: `cdHub.editorHeader`, `cdHub.title`, `cdHub.repairContractsListSearchInput` — все из `contracts-list-hub.module.css`, где описан селектор `.repairContractsListPage .editorHeader .title`.
