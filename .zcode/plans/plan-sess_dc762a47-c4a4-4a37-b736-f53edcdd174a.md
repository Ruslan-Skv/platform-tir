# Новый раздел «Окна»: публичная страница + управление в админке

## Context

На сайте (601270.ru, Next.js + NestJS + Prisma/PostgreSQL) нужен новый раздел «Окна» по образцу oknadomkom.ru/plastikovye-okna: пролистываемые вкладки профильных систем с характеристиками и CTA. Контент — с сайтов поставщиков (окна REHAU, VEKA, WHS), уже собран. Раздел полностью управляется из админки (аналог раздела «Акции»/«Наши работы»). Решения пользователя: пункт меню — **топ-уровень** «Окна» → `/windows`; из доп. блоков — **таблица сравнения** всех профилей (SVG-заглушки и FAQ не делаем).

## 1. Модель данных (`backend/prisma/schema.prisma`)

По образцу `ServiceCatalogCategory/Item` и `Promotion` (schema.prisma:892–955, 1643):

```prisma
model WindowBrand {            // REHAU / VEKA / WHS  → window_brands
  id, name, slug @unique, logoUrl?, country?, description? @db.Text,
  sortOrder Int @default(0), isActive Boolean @default(true), timestamps
  systems WindowProfileSystem[]
}
model WindowProfileSystem {    // Blitz, Grazio, INTELIO 80… → window_profile_systems
  id, brandId (+relation, Cascade), name, slug @unique, tagline?,
  description @db.Text, imageUrl?,
  chambers Int?, mountingDepth Int? (мм), glassUnitWidth String?,
  thermalResistance String?, soundInsulation String?,
  advantages String[],          // как ServiceItem.features (schema.prisma:882)
  characteristics Json?,        // [{label,value}] — доп. строки характеристик
  priceFrom Int?, badge?, sortOrder, isActive, timestamps, @@index([brandId])
}
model WindowsPageBlock {       // настройки раздела (hero + SEO) → windows_page_block, singleton id="main"
  title @default("Пластиковые окна"), subtitle?, description? @db.Text, heroImageUrl?,
  seoTitle?, seoDescription? @db.Text, updatedAt
}
```

Миграция: `npx prisma migrate dev --name add_windows_section`.

## 2. Бэкенд-модуль `backend/src/admin/windows/` (по образцу `admin/promotions/` и `admin/photo/`)

- `windows.controller.ts` — `@Controller('admin/windows')`, `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('ADMIN','CONTENT_MANAGER')`:
  - `POST upload` — multer diskStorage → `uploads/windows/` (10 МБ, jpg/png/webp/gif — копия `promotion.controller.ts:30-73`);
  - бренды: `GET/POST /brands`, `PATCH/DELETE /brands/:id`;
  - системы: `GET /systems?brandId=`, `GET/POST /systems`, `PATCH/DELETE /systems/:id`;
  - `GET/PATCH /settings` (WindowsPageBlock, upsert).
- `windows-public.controller.ts` — `@Controller('windows')`: `GET /windows` → `{ settings, brands: [{...brand, systems: [...] }] }` (только isActive, по sortOrder).
- `windows.service.ts` (весь Prisma-доступ, rename загруженного файла как `photo.service.ts:347`), `windows.module.ts`, `dto/` (create/update для брендов, систем, настроек).

Регистрация доступа (4 места, по аналогии с `admin.content.photo`):
- `backend/src/admin/admin.module.ts` — импорт `WindowsModule`;
- `backend/src/common/config/admin-api-route-resources.config.ts` — `{ prefix: '/api/v1/admin/windows', resourceId: 'admin.content.windows' }`;
- `backend/src/admin/admin-access/resources.config.ts` — `{ id: 'admin.content.windows', label: 'Окна', path: '/admin/content/windows' }`;
- `backend/src/admin/admin-access/role-default-resources.config.ts` — в списки ADMIN и CONTENT_MANAGER (строки ~58–75 и ~143–155).

## 3. Сид контента `backend/prisma/seed-windows.ts` + npm-скрипт `prisma:seed-windows` (идемпотентный, по образцу seed.ts:712–742)

Бренды и системы (данные с сайтов поставщиков):

| Система | Камеры | Глубина | Стеклопакет | Теплозащита Rопр | Шум |
|---|---|---|---|---|---|
| REHAU Blitz New | 3 | 60 мм | — | 0,70 м²·°С/Вт | — |
| REHAU Grazio | 5 | 70 мм | 10–41 мм | 0,85 | 39–45 дБ |
| REHAU INTELIO 80 | 6 | 80 мм | до 53 мм | 0,98 | до 40 дБ(А) |
| VEKA Softline 82 | 7/6 | 82 мм | — | 1,12 | — |
| VEKA Softline | 5 | 70 мм | — | 0,94 | — |
| VEKA Euroline | 3 | 58 мм | — | 0,77 | — |
| WHS 60 | 4 | 60 мм | 24–32 мм | — | — |
| WHS 72 | 5 | 72 мм | 24–44 мм | — | — |

Плюс: описания/преимущества из собранного контента (Grazio — «для северного климата», INTELIO 80 — 60 лет, створки до 110×240 см, HDF-поверхность; VEKA — класс А DIN EN 12608, A++/A+/A; WHS — «WHS by VEKA», 2 контура уплотнения, 40+ ламинаций); `characteristics` JSON для доп. строк (фальц, уплотнения, классы ГОСТ). `priceFrom` — поле есть, сеедом не заполняем (наши цены внесёт админ). Картинки — пустые (админ загрузит; на публике — аккуратный placeholder-блок).

Также сид/`seed.ts`: добавить топ-уровень «Окна» → `/windows` в `defaultNavItems` (seed.ts:712); при создании сдвинуть sortOrder, чтобы встал между «Натяжные потолки» и «Акции».

## 4. Публичная страница `/windows`

- Роут: `frontend/src/app/(site)/windows/page.tsx` — серверный: SSR-fetch `getWindowsSection(getServerApiBaseUrl())` (как `fetchNavigation` в `(site)/layout.tsx`), `generateMetadata` из settings (seoTitle/seoDescription, revalidate 60). Хардкод-фолбэк `DEFAULT_WINDOWS_SECTION` на случай лежащего API (философия сайта — nav/hero фолбэки уже есть).
- API-клиент: `frontend/src/shared/api/windows.ts` (типы + клиентский и серверный fetch, по образцу `shared/api/promotions.ts` + navigation.ts).
- Вью: `frontend/src/views/windows/ui/WindowsPage/` — `Page.tsx` + `hooks/useWindowsPage.ts` (react-query, initialData) + `PageView.tsx` + `.module.css` (токены из globals.css, `--color-accent`).
  Структура (по референсу oknadomkom):
  1. Hero: title/subtitle/description + кнопки «Вызвать замерщика» и «Рассчитать стоимость» — переиспользовать `useFormContext()` модали (`features/forms/FormContext.tsx`: measurementModal/quoteModal; в QuoteForm опция «Окна» уже есть);
  2. Вкладки брендов REHAU|VEKA|WHS — горизонтальный скролл + scroll-snap (`role="tablist"`, `aria-selected` — CSS как `.sliderViewport` в PhotoPage.module.css:390–410, пилюли как CatalogHubPreview modeToggle), deep-link через `#rehau` hash;
  3. Внутри бренда: пилюли профильных систем + карточка выбранной системы: badge, tagline, картинка (или placeholder), описание, `<dl>` характеристик, преимущества списком, priceFrom «от N ₽», CTA;
  4. **Таблица сравнения** всех 8 систем (камеры/глубина/стеклопакет/R/шум) в `.tableScroll` (по образцу ServiceCategoryPage);
  5. Нижний CTA-блок; хлебные крошки «Главная / Окна».
- Меню: в `frontend/src/shared/constants/navigation.ts` добавить `{ name: 'Окна', href: '/windows', hasDropdown: false }` после «Натяжные потолки» (fallback-константа, строка 27–30).

## 5. Админка «Контент → Окна»

- Роуты: `frontend/src/app/admin/content/windows/page.tsx` (обзор), `brands/new|brands/[id]/edit`, `systems/new?brandId=|systems/[id]/edit` — тонкие оболочки.
- Вью: `frontend/src/views/admin/Content/Windows/` по паттерну Promotions (`Page.tsx` + `hooks/use*` + `PageView.tsx` + `.module.css`):
  - `WindowsPage` — форма настроек раздела (hero/SEO) + таблица брендов + таблица систем (группировка по бренду, toggle isActive, удаление через `ConfirmModal`);
  - `WindowBrandFormPage` — name, slug (автогенерация slugify как `promotion-form-page.utils.ts`), logo upload, country, description, sortOrder, isActive;
  - `WindowSystemFormPage` — выбор бренда, name/slug/tagline/badge, описание, загрузка картинки, числовые поля (камеры, глубина, стеклопакет, R, шум, priceFrom), динамический список преимуществ, динамические строки characteristics {label,value}, sortOrder, isActive.
- API-клиент `frontend/src/shared/api/admin-windows.ts` (копия паттерна `admin-promotions.ts`: getAuthHeaders, uploadWindowsImage с FormData).
- Сайдбар `frontend/src/widgets/admin/Sidebar/AdminSidebar.tsx:388` — пункт «Окна» в группе «Контент» после «Наши работы».
- Ресурсы: `frontend/src/shared/config/admin-resources.ts:203` + `admin-resource-tree.ts` — зеркальная запись `admin.content.windows` (гейтинг через AdminSectionAccessShell подключится сам).

## 6. Проверка

1. `cd backend && npx prisma migrate dev --name add_windows_section && npm run prisma:seed-windows && npm run build` (tsc).
2. Поднять postgres (docker compose) + backend; `curl http://localhost:3001/api/v1/windows` — бренды с системами; CRUD-эндпоинты admin/windows под токеном админа.
3. `cd frontend && npm run build && npm run check-architecture`; dev-сервер: `/windows` — вкладки брендов/систем, таблица сравнения, открытие модалей замера/расчёта, пункт «Окна» в шапке; `/admin/content/windows` — создание/редактирование бренда и системы, загрузка картинки, настройки раздела, права (скрыт без ресурса).
4. Визуальная проверка страниц в браузере (skill web-gui-tester).

Замечания: изменённые в git `frontend/public/workbox/*` не трогаем — не относится к задаче. Миграция и сид применяются к локальной БД (docker compose postgres).