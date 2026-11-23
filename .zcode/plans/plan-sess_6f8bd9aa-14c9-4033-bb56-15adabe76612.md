# Новый раздел «Жалюзи» — по образцу «Окна» и «Натяжные потолки»

## Контекст
В приложении каждый раздел («Окна», «Натяжные потолки») — это отдельный модуль: 3 таблицы Prisma (категория → товары → настройки страницы-синглтон), NestJS-модуль с публичным GET и админским CRUD, лендинг на Next.js и страницы управления в админке. «Жалюзи» уже частично существует (направление в CRM, пункты каталога, карточка на главной, ссылка футера `/blinds` — сейчас битая), но публичной страницы и управления контентом нет. Контент наполнения адаптирован с kapri51.ru и foroom.ru. За образец берётся самый свежий и полный раздел — «Натяжные потолки» (hero, вкладки, сравнение, калькулятор, этапы, FAQ, CTA).

## 1. База данных (`backend/prisma`)
**schema.prisma** — 3 модели после `StretchCeilingsPageBlock` (~строка 1880):
- `BlindsCategory` (`blinds_categories`) — тип изделия (вкладка): id, name («Рулонные шторы»), slug unique, imageUrl, description, sortOrder, isActive, `products BlindsProduct[]`
- `BlindsProduct` (`blinds_products`) — система/модель: categoryId FK (Cascade), name, slug unique, tagline, description Text, imageUrl, videoUrl, `mountType` («На створку», «На проём», «На стену»), `material` («Ткань blackout», «Алюминий 25 мм», «Дерево»), `controlType` («Цепочное», «Электропривод», «Без сверления»), characteristics Json `[{label,value}]`, advantages String[], `priceFrom` Int? (₽/м² «под ключ»), badge, sortOrder, isActive; `@@index([categoryId])`
- `BlindsPageBlock` (`blinds_page_block`, синглтон id="main") — hero/SEO; сравнение (comparisonShow + ShowMount/Material/Control/Price); калькулятор (calcShow/Title/Note, calcMountPrice=300, calcMotorPrice=5500, calcNoDrillPrice=400, calcMinOrder=2500); steps Json, faq Json; CTA-блок (как у потолков: фон, fit, opacity, цвет, кнопки)

**Миграция** `migrations/20261123130000_add_blinds_section/migration.sql` — по структуре миграции потолков.

## 2. Backend-модуль `backend/src/admin/blinds/`
- `blinds.module.ts`, `blinds.controller.ts` (`@Controller('admin/blinds')`, JwtAuthGuard+RolesGuard, `@Roles('ADMIN','CONTENT_MANAGER')`, `POST upload` → `uploads/blinds/` по образцу `stretch-ceilings.controller.ts`, CRUD `categories`/`products`, `GET|PATCH settings`)
- `blinds-public.controller.ts`: `GET /api/v1/blinds` → `{ settings, categories }` (с активными товарами)
- `blinds.service.ts` (паттерн `emptyToNull`) + `dto/` (create/update категории и товара, update settings — с StepItemDto/FaqItemDto)
- Регистрация в `admin.module.ts` (~строки 47, 121)
- RBAC: `resources.config.ts` → `admin.content.blinds` (~222); `role-default-resources.config.ts` → списки ADMIN (~75) и CONTENT_MANAGER (~163)

## 3. Seed-наполнение
- `prisma/data/blinds-section.json`: настройки (SEO под Мурманск, калькулятор, 6 этапов, 8 вопросов FAQ) + **5 категорий, ~17 товаров**: Рулонные шторы (UNI-2 кассетные, MINI на раму, на проём, Blackout), Шторы зебра день-ночь (UNI, MINI, на проём), Вертикальные (тканевые 89 мм, мультифактурные, нитяные «Бриз», фотопечать), Горизонтальные (алюминиевые 25 мм, кассетные 16 мм, деревянные, межрамные), Плиссе и гофре
- `prisma/seed-blinds.ts` — идемпотентный по образцу `seed-stretch-ceilings.ts` (по умолчанию только создаёт недостающее; `BLINDS_FORCE=1` обновляет контент; создаёт пункт меню «Жалюзи» → `/blinds` после «Окна»)
- npm-скрипт `prisma:seed-blinds-section` в `backend/package.json` (~49)

## 4. Публичная страница (frontend)
- `src/shared/api/blinds/`: `blinds.ts` (типы, `fetchBlindsSection`/`getBlindsSection`, эндпоинт `/blinds`), `admin-blinds.ts` (CRUD + upload), `index.ts`
- `src/views/blinds/ui/BlindsPage/`: `BlindsPage.tsx`, `BlindsPageView.tsx` (крошки, h1, hero с заметками «Бесплатный замер / Изготовление от 2 дней / Монтаж за один визит / Гарантия до 3 лет», вкладки категорий → вкладки изделий → карточка изделия, таблица сравнения, этапы, FAQ), `BlindsCalculator.tsx` (слайдеры ширина/высота в см + количество изделий; выбор изделия из каталога; опции: монтаж / электропривод / без сверления; минимальный заказ; CTA «Получить точный расчёт»), `BlindsCtaBlock.tsx` (модальные формы замера/расчёта), `BlindsFaqJsonLd.tsx`, `hooks/useBlindsPage.ts` (hash-deep-link `#rulonnye-shtory`), `blinds-defaults.ts`, `BlindsPage.module.css`, `index.ts`
- `src/app/(site)/blinds/page.tsx`: `revalidate = 60`, SSR-фетч, `generateMetadata`, FAQ JSON-LD
- Интеграции: `navigation.ts` — топ-пункт «Жалюзи» → `/blinds` после «Окна» (~35); `homeConstants.ts` — href карточки «Жалюзи» → `/blinds` (~106); `sitemap.ts` — добавить `/blinds`; ссылка футера уже ведёт на `/blinds`

## 5. Админка (frontend)
- Маршруты `src/app/admin/content/blinds/`: `page.tsx`, `categories/{new,[id]/edit}`, `products/{new,[id]/edit}`
- Вьюхи `src/views/admin/Content/Blinds/{list,form}` по образцу `StretchCeilings`: список (форма настроек: hero/SEO/сравнение/калькулятор/этапы/FAQ/CTA + таблицы категорий и товаров + ConfirmModal), формы категории и товара (слаг, картинки, характеристики, преимущества)
- `admin-resources.ts` → `admin.content.blinds` (~214); `AdminSidebar.tsx` → пункт «Жалюзи» (~399)

## Верификация
1. Backend: `npx prisma migrate dev --name add_blinds_section` → `npm run prisma:seed-blinds-section` → `nest build` → проверка `curl http://localhost:3001/api/v1/blinds` (settings + 5 категорий)
2. Frontend: `npm run type-check`, `npm run lint`; dev-сервер → страница `/blinds` (вкладки, калькулятор, FAQ, CTA), `/admin/content/blinds` — CRUD категории/товара/настройки + загрузка изображения
3. Навигация: топ-меню «Жалюзи», карточка на главной, футер, `/sitemap.xml`