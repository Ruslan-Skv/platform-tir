# Второй вариант шапки публичного сайта («липкая» с трансформацией при скролле)

## Context

На публичном сайте territory-interior.ru (route group `(site)` Next.js-приложения `frontend/`) текущая шапка на десктопе статична (`position: relative`) и уезжает вместе со страницей. Нужен **второй вариант шапки**: залипание сверху + трансформация при прокрутке вниз по аналогии с myaudza.ru (там шапка всегда fixed, а при скролле у неё появляется полупрозрачный «стеклянный» фон `rgba(255,255,255,.72)` + `backdrop-filter: blur(20px) saturate(1.4)` с анимацией, и «пилюля» меню растворяется). Текущий вариант шапки не трогаем; переключение — в админке, только для SUPER_ADMIN, по готовому паттерну singleton-настроек `SitePublicConfig`.

Решения согласованы с пользователем:
- **Десктоп (>768px)**: `position: sticky; top: 0` (залипание без компенсации padding в globals.css); в начале страницы выглядит как классическая; при `scrollY > 100px` — TopBar (поиск/избранное/корзина/профиль) плавно сворачивается, фон шапки становится «стеклом» с blur и тенью. «Пилюля» навигации остаётся (осознанное упрощение).
- **Мобильная шапка (≤768px)**: без изменений — она уже фиксирована (6rem) и одинакова в обоих вариантах.
- Значение по умолчанию — `'classic'`: текущий сайт не меняется, пока суперадмин не включит новый вариант.

## 1. Backend (NestJS + Prisma)

1. **`backend/prisma/schema.prisma`** — в `model SitePublicConfig` (стр. ~2799) добавить:
   ```prisma
   headerVariant       String   @default("classic")
   ```
2. **Новая миграция** `backend/prisma/migrations/20261113120000_site_public_header_variant/migration.sql` (по образцу `20261104100000_admin_logo_variant`):
   ```sql
   -- Вариант шапки публичного сайта: classic | sticky
   ALTER TABLE "site_public_config" ADD COLUMN "headerVariant" TEXT NOT NULL DEFAULT 'classic';
   ```
3. **`backend/src/site-public/dto/update-site-public.dto.ts`** — добавить опциональное поле `headerVariant?: 'classic' | 'sticky'` (`@IsOptional()`, `@IsIn(['classic', 'sticky'])`, `@ApiPropertyOptional`).
4. **`backend/src/site-public/site-public.service.ts`**:
   - `getPublicConfig()` — вернуть `headerVariant: block?.headerVariant === 'sticky' ? 'sticky' : 'classic'`;
   - `updateAdminSettings()` — прокинуть `dto.headerVariant` в upsert (`update` и `create`).
   - `getAdminSettings()` — без изменений (колонка вернётся из БД; create-ветка получит дефолт Prisma).

Гварды уже стоят на всём контроллере `admin/site-public` (`@Roles('SUPER_ADMIN')` + `JwtAuthGuard`) — новые поля автоматически защищены.

## 2. Frontend — публичная часть

5. **`frontend/src/shared/api/site-public.ts`** — в `SitePublicConfig` добавить `headerVariant?: 'classic' | 'sticky'`.
6. **`frontend/src/shared/lib/contexts/SitePublicConfigContext.tsx`** — в `SitePublicConfigState` добавить `headerVariant: 'classic' | 'sticky'` (дефолт `'classic'`), маппить из ответа API в provider.
7. **Новый компонент** `frontend/src/widgets/header/StickyHeader/StickyHeader.tsx` + `StickyHeader.module.css`:
   - `'use client'`; повторяет композицию `HeaderChrome` из `Header.tsx` (TopBar, Logo, ActionButtons, мобильный ряд, Navigation) и так же обёрнут в `Suspense` + `useCatalogHeaderSearch` — все существующие дочерние компоненты переиспользуются как есть, `Header.tsx` не изменяется вообще;
   - хук скролла внутри файла: passive `scroll` listener + первичная проверка `window.scrollY > SCROLL_THRESHOLD` (константа `100`);
   - рут `<header>` получает `data-scrolled={scrolled}` и мод-класс `scrolled`;
   - TopBar обёрнут в собственный `div.topBarWrap` для анимации сворачивания (`max-height: 2.5rem → 0`, `opacity`, `overflow: hidden`);
   - CSS: `.header { position: sticky; top: 0; z-index: 50; background: #fff; transition: background-color .3s, box-shadow .3s }`; `.scrolled`: фон `rgba(255,255,255,.78)` + `backdrop-filter: blur(20px) saturate(1.4)`, тень `0 4px 24px rgb(0 0 0 / .06)`, лёгкая нижняя граница; тёмная тема (`:where(html[data-theme='dark'], [data-app-theme='dark'])`) — стекло `rgba(23,23,23,.78)`; `@media (prefers-reduced-motion: reduce)` — без переходов; `@media (width <= 768px)` — поведение как у классики (`position: fixed`, высота мобильной шапки та же, эффект стекла не применяется).
8. **`frontend/src/widgets/header/index.ts`** — добавить `export { StickyHeader } from './StickyHeader';`.
9. **`frontend/src/widgets/site-layout/SiteLayout/SiteLayout.tsx`** — единственная правка точки монтажа: внутренний компонент
   ```tsx
   function PublicSiteHeader() {
     const { headerVariant } = useSitePublicConfig();
     return headerVariant === 'sticky' ? <StickyHeader /> : <Header />;
   }
   ```
   и `<Header />` → `<PublicSiteHeader />`. До загрузки конфига рендерится классика (как уже работает `rolesShowAdminLink`).

## 3. Frontend — админка

10. **`frontend/src/shared/api/admin-site-public.ts`** — в `AdminSitePublicSettings` добавить `headerVariant?: string | null`; в payload `updateAdminSitePublicSettings` — `headerVariant?: 'classic' | 'sticky'`.
11. **Новая страница** `frontend/src/app/admin/settings/public-header/page.tsx` (тонкая обёртка по образцу `admin-link/page.tsx`) + **`frontend/src/views/admin/Settings/public-header/PublicHeaderSettingsPageView.tsx`** (+ свой `PublicHeaderSettingsPage.module.css` по образцу admin-link):
    - гейт `user?.role !== 'SUPER_ADMIN'` → сообщение «доступно только супер-администратору» (бэк тоже ограничивает);
    - radio-выбор: «Классическая» / «Липкая с трансформацией при прокрутке» с пояснениями;
    - загрузка `getAdminSitePublicSettings()`, сохранение PATCH `{ headerVariant }`, тосты успех/ошибка, кнопка `data-admin-mutation`, ссылка «Открыть публичку →».
12. **`frontend/src/views/admin/Settings/hub/SettingsHubPageView.tsx`** — добавить в `SETTINGS_LINKS` после admin-link: `{ href: '/admin/settings/public-header', label: 'Шапка публичного сайта' }`.

## Что не меняем

`Header.tsx`, `TopBar`, `Navigation`, `ActionButtons`, их CSS, `globals.css`, мобильная шапка и `MobileBottomNav` — нетронуты. Sticky вместо fixed означает, что компенсация `padding-top` в `globals.css` не нужна (нет прыжков контента).

## Проверка

1. Backend: `cd backend && npx prisma format && npx prisma generate && npm run type-check && npm run lint`; применить миграцию к локальной БД (`npx prisma migrate dev` / через docker-compose — по факту окружения).
2. Frontend: `cd frontend && npm run validate` (type-check + lint + format:check + check-architecture).
3. Ручная проверка (при запущенном окружении): под суперадмином открыть `/admin/settings/public-header` → включить «Липкую» → на публичке убедиться: шапка залипает при скрутке, TopBar сворачивается, появляется «стекло»; переключить обратно «Классическую» → шапка как раньше. Проверить тёмную тему, дропдауны навигации и мобильную ширину (≤768px — без изменений).