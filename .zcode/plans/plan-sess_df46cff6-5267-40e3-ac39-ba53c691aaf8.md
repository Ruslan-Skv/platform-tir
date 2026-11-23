# Новый раздел «Мебель» (публичка + админка)

## Контекст

Компания производит мебель по индивидуальным размерам (кухни, гардеробные, шкафы…). Нужен публичный раздел `/furniture` по образцу существующих «Окна»/«Натяжные потолки»/«Жалюзи», полностью управляемый из админки. Эталон — раздел «Жалюзи» (самый свежий, коммит e6a16b5f): каждый раздел — вертикальный слайс из Prisma-моделей + NestJS-модуля + публичной страницы Next.js + админ-CRUD + сид-контента. Исследование сайтов производителей мебели (Вереск, Кухни-Смарт, Дешевая Мебель и др.) подтвердило структуру: hero с УТП → категории с ценами «от» → калькулятор → материалы и фурнитура → этапы → FAQ → CTA. Цены: кухни «за погонный метр», шкафы/гардеробные «за изделие».

Решения пользователя: базовый набор из 6 категорий (~20 изделий); пункт меню «Мебель на заказ» репойнтится на `/furniture` (в футере ссылка на `/furniture` уже есть).

## Модель данных (адаптация под мебель)

`FurnitureCategory` → `FurnitureProduct` → `FurniturePageBlock` (singleton `id="main"`), таблицы `furniture_categories/products/page_block` — структурно как blinds (`schema.prisma:1884-1981`). Отличия от BlindsProduct:

| Blinds | Furniture | Смысл |
|---|---|---|
| `mountType` | `configuration` | «Прямая», «Угловая», «Встроенная», «Корпусная» |
| `material` | `facadeMaterial` | «ЛДСП Egger», «МДФ в плёнке ПВХ», «МДФ эмаль», «Шпон» |
| `controlType` | `hardware` | «Blum», «Hettich», «Boyard» |
| `priceFrom` (₽/м²) | `priceFrom` + `priceUnit String?` | «пог. м» / «м²» / null=«за изделие» |

`FurniturePageBlock` = все поля BlindsPageBlock (hero, SEO, comparison-тумблеры, steps, faq, CTA-оформление), но:
- калькулятор: `calcAssemblyPrice` (сборка и установка, 3000), `calcDeliveryPrice` (доставка, 1500), `calcPremiumHardwarePrice` (фурнитура Blum/Hettich, 5900), `calcMinOrder` (15000);
- новый блок «Материалы и фурнитура»: `materialsShow Boolean`, `materialsTitle String?`, `materials Json` — `[{name, description}]` (ЛДСП, МДФ ПВХ, пластик, эмаль, шпон, столешницы, фурнитура Blum/Boyard) — редактор в админке по образцу «Этапы работы».

## Шаги реализации

### 1. Бэкенд: БД
- `backend/prisma/schema.prisma` — 3 модели после `BlindsPageBlock` (перед `Comment`, ~строка 1982).
- Миграция `backend/prisma/migrations/20261123140000_add_furniture_section/migration.sql` (копия структуры blinds-миграции `20261123130000`, переименованные таблицы/индексы + новые поля).

### 2. Бэкенд: модуль `backend/src/admin/furniture/`
Копия `backend/src/admin/blinds/` с заменой имён и семантики:
- `furniture.module.ts`, `furniture-public.controller.ts` (`GET /api/v1/furniture`), `furniture.controller.ts` (`admin/furniture`: `upload` → `uploads/furniture/`, CRUD `categories`/`products`, `settings`; `@Roles('ADMIN','CONTENT_MANAGER')`), `furniture.service.ts` (slug-проверки, `emptyToNull`, дефолты настроек, `getPublicSection`), `dto/` — 5 DTO (`ProductCharacteristicItemDto`, `FaqItemDto`, `StepItemDto`, `MaterialItemDto` для materials Json).

### 3. Бэкенд: регистрация
- `backend/src/admin/admin.module.ts` — импорт/подключение `FurnitureModule` (рядом с BlindsModule, строки 48/123).
- `backend/src/admin/admin-access/resources.config.ts` — `{ id: 'admin.content.furniture', label: 'Мебель', path: '/admin/content/furniture' }` после blinds (строка 224).
- `backend/src/admin/admin-access/role-default-resources.config.ts` — `'admin.content.furniture'` в ADMIN (после строки 76) и CONTENT_MANAGER (после строки 165).

### 4. Сид-контент
- `backend/prisma/data/furniture-section.json` — настройки (title «Мебель», subtitle, description, SEO под Мурманск, калькулятор, 6 этапов: заявка → бесплатный замер и 3D-проект → договор → производство → доставка и сборка → гарантия до 5 лет; 9 вопросов FAQ из исследования: стоимость, замер, сроки, оплата/рассрочка, материалы, доставка, образцы, изменения в проекте, гарантия) + 6 категорий: **Кухни** (прямые, угловые, П-образные, с островом, мини — цены «от 14 900–29 900 ₽/пог. м»), **Шкафы-купе** (встроенные, корпусные, радиусные, зеркальные), **Гардеробные** (модульные, встроенные, с дверями-купе), **Прихожие**, **Детская мебель**, **Мебель для ванной** — у каждого изделия tagline, описание, facadeMaterial, configuration, hardware, characteristics, advantages, priceFrom+priceUnit, badge («Хит», «Премиум»…); + материалы (7 карточек).
- `backend/prisma/seed-furniture.ts` — идемпотентный (по образцу `seed-blinds.ts:1-259`, режим `FURNITURE_FORCE=1`), создаёт недостающее, не трогает правки админки; репойнтит `NavigationItem` «Мебель на заказ» → `/furniture` (по имени или href `/catalog/products/custom-furniture`, иначе создаёт после «Жалюзи») и `FooterSectionLink` «Мебель» → `/furniture`.
- `backend/package.json` — скрипт `prisma:seed-furniture-section` (рядом со строкой 49).

### 5. Фронтенд: API-клиенты
- `frontend/src/shared/api/furniture/furniture.ts` (типы + `fetchFurnitureSection`/`getFurnitureSection`), `admin-furniture.ts` (CRUD + `uploadFurnitureImage`), `index.ts` — копии `shared/api/blinds/*` с новыми типами (`priceUnit`, `configuration`…).

### 6. Фронтенд: публичная страница
- `frontend/src/app/(site)/furniture/page.tsx` — SSR (`revalidate = 60`), `generateMetadata`, `FurnitureFaqJsonLd` (копия `blinds/page.tsx`).
- `frontend/src/views/furniture/ui/FurniturePage/` — копия структуры `views/blinds/ui/BlindsPage/`: `FurniturePage.tsx`, `FurniturePageView.tsx` (hero с мебельными УТП: бесплатный замер и 3D-проект / собственное производство / изготовление от 14 дней / гарантия до 5 лет / рассрочка 0%; вкладки категорий → изделий; сравнительная таблица с колонками Конфигурация/Фасады/Фурнитура/Цена; **новый блок «Материалы и фурнитура»**; этапы; FAQ; CTA «Поможем спроектировать мебель» c кнопками `measurementModal`/`quoteModal`), `FurnitureCalculator.tsx` (ползунок «Длина, пог. м» 1–6 м для изделий с ценой за пог. м; для «за изделие» — фикс; опции сборка/доставка/фурнитура), `FurnitureCtaBlock.tsx`, `FurnitureFaqJsonLd.tsx`, `furniture-defaults.ts` (офлайн-фолбэк), `hooks/useFurniturePage.ts` (deep-link `#slug`), `FurniturePage.module.css` (копия CSS blinds + стили блока материалов), `index.ts`.
- `frontend/src/app/sitemap.ts` — запись `/furniture` (после `/blinds`, строка 33).
- `frontend/src/shared/constants/navigation.ts` — пункт «Мебель на заказ» → `href: '/furniture'` (строка 23); дропдаун «Каталог» не трогаем.

### 7. Фронтенд: админка
- Тонкие обёртки `frontend/src/app/admin/content/furniture/{page.tsx, categories/new, categories/[id]/edit, products/new, products/[id]/edit}`.
- `frontend/src/views/admin/Content/Furniture/` — копия `Content/Blinds/`: `index.ts`; `list/` (страница «Мебель»: настройки с подформами Таблица сравнения / Калькулятор / **Материалы и фурнитура** / Этапы / FAQ / CTA-блок + таблицы «Категории» и «Изделия»); `form/` (категория и изделие: select «Единица цены» — пог. м/м²/за изделие, поля Конфигурация/Материал фасада/Фурнитура, характеристики/преимущества, загрузка фото и видео, авто-slug `slugifyFurnitureName`); CSS-модули — копии.
- `frontend/src/widgets/admin/Sidebar/AdminSidebar.tsx` — пункт «Мебель» после «Жалюзи» (строка 400).
- `frontend/src/shared/config/admin-resources.ts` — ресурс `admin.content.furniture` (после строки 215).

Переиспользуются как есть: `publicUploadUrl`, `apiFetch`/`serverFetch`, `getServerApiBaseUrl`, `VideoPlayer`, `Button`, `ConfirmModal`, `uploadsBaseUrl`, `FormContext`-модалки.

## Верификация
1. Бэкенд: `npx prisma validate` + `npx prisma generate` + `npm run build` (tsc) в `backend/`; eslint новых файлов.
2. Фронтенд: `npm run build` (или `tsc --noEmit`) + lint в `frontend/`.
3. Runtime: поднять инфраструктуру (`docker-compose.infra.yml`, если не запущена), применить миграцию (`npx prisma migrate deploy` / `prisma:migrate`), выполнить `npm run prisma:seed-furniture-section`; проверить `GET http://localhost:3001/api/v1/furniture` (settings+6 категорий), страницу `http://localhost:3000/furniture` (hero, вкладки, таблица, калькулятор, материалы, FAQ, CTA), повторный запуск сида — идемпотентен.
4. Админка: вход под ADMIN/CONTENT_MANAGER, `/admin/content/furniture` — правка настроек/этапов/FAQ, создание категории и изделия (авто-slug, загрузка картинки), вкл/выкл активности — и отражение изменений на публичной странице (ISR revalidate 60 + клиентское обновление).