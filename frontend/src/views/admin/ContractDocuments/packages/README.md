# Пакеты документов (ContractDocuments/packages)

Структура раздела «Оформление договоров» — шесть направлений, два семейства комплектов, общий код в `platform/`.

## Направления (kind)

| Kind        | UI      | Семейство       | `directions/`                      |
| ----------- | ------- | --------------- | ---------------------------------- |
| `REPAIR`    | Ремонт  | `REPAIR_LIKE`   | scaffold (код в `platform/`)       |
| `WINDOWS`   | Окна    | `PRODUCT_LIKE`  | алиасы `Windows*` → `product-like` |
| `DOORS`     | Двери   | `PRODUCT_LIKE`  | алиасы `Doors*` → `product-like`   |
| `CEILINGS`  | Потолки | `UNIMPLEMENTED` | scaffold                           |
| `BLINDS`    | Жалюзи  | `UNIMPLEMENTED` | scaffold                           |
| `FURNITURE` | Мебель  | `UNIMPLEMENTED` | scaffold                           |

Реестр: `config/packageDirectionRegistry.ts`.

## Слои

```
packages/
├── config/           — реестр направлений, маршруты, catalog kinds
├── platform/         — универсальный код редактора пакета
│   ├── editor/       — вкладки, превью, печать
│   ├── form/         — PackageFormData, шаблоны, placeholders
│   ├── hub/          — оплаты, pipeline, модалки hub
│   ├── tabs/         — id вкладок, библиотека шаблонов
│   ├── payments/     — счета, ПКО, основания оплат
│   ├── estimates/    — сметы, пресеты, print embed
│   ├── questionnaires/
│   └── workOrders/
├── families/
│   └── product-like/ — спецификация, Д/с, стоимость (окна, двери, …)
├── templates/        — резервный HTML по вкладкам + overrides по kind
├── directions/       — только дельты направления (алиасы / scaffold)
└── pages/            — списки, редактор, библиотека шаблонов
```

Утилиты без привязки к направлению — в `../core/` (`applyTemplate`, `printDocument`, `typography/`).

## Семейства

| Семейство       | Направления             | Особенности                                        |
| --------------- | ----------------------- | -------------------------------------------------- |
| `REPAIR_LIKE`   | Ремонт                  | Смета, акты, заказ-наряды, производственный журнал |
| `PRODUCT_LIKE`  | Окна, Двери             | Счёт-заказ, спецификация, памятка                  |
| `UNIMPLEMENTED` | Потолки, Жалюзи, Мебель | В реестре; создание договоров отключено            |

Новый товарный комплект = запись в реестре + (при необходимости) overrides в `templates/`; отдельная папка в `directions/` — только если есть уникальный UI или логика.
