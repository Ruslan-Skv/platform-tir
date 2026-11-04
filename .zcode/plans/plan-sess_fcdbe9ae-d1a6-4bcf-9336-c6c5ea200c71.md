# Настройка логотипа админки — два варианта отображения

## Контекст

Логотип админки («домик» + текст **«Виртуальный офис»**, компонент `AdminPlatformBrand`) сейчас набирается шрифтом **Play** (800, uppercase, синий 3D-shadow). На странице миссии `/mission` заголовок — тоже Play, а сам текст миссии (`.intro`/`.paragraph` в `MissionPageView.module.css`) — рукописный **Great Vibes**. Значит «шрифт миссии» = **Great Vibes** (уже подключён глобально в `globals.css` → `public/fonts/Great_Vibes/`, отдельной загрузки не нужно).

В разделе «Настройки» сайдбара добавляем новый подраздел **«Настройка логотипа админки»** с выбором из двух вариантов:
1. **Классический** — текущий вид (Play, uppercase).
2. **«Миссия»** — текст логотипа шрифтом Great Vibes.

Хранение — **персональная настройка** в существующей системе `admin-sidebar-ui-prefs` (localStorage + синхронизация с аккаунтом через `PATCH /users/me/admin-sidebar-ui-prefs`), по образцу раздела «Внешний вид админки». Это даёт мгновенное применение и работу на странице логина (без запроса к API), без нового NestJS-модуля.

## Backend (5 правок)

1. **`backend/prisma/schema.prisma`** (User, рядом с `adminSidebarNavOrder`, ~стр. 61):
   ```prisma
   /// Вариант логотипа админки: classic | mission
   adminLogoVariant                        String                                    @default("classic")
   ```
2. **Новая миграция** `backend/prisma/migrations/20261104100000_admin_logo_variant/migration.sql` (по образцу `20261103100000_admin_sidebar_nav_order`):
   ```sql
   ALTER TABLE "users" ADD COLUMN "adminLogoVariant" TEXT NOT NULL DEFAULT 'classic';
   ```
3. **`backend/src/users/dto/update-admin-sidebar-ui-prefs.dto.ts`** — поле `logoVariant?: 'classic' | 'mission'` с `@IsIn(['classic', 'mission'])`.
4. **`backend/src/users/users.service.ts`** — `logoVariant` в типе `AdminSidebarUiPrefs`, `formatAdminSidebarUiPrefs` (`=== 'mission' ? 'mission' : 'classic'`), select в `getAdminSidebarUiPrefs` и data/select в `updateAdminSidebarUiPrefs`.
5. **`backend/src/admin/admin-access/admin-resource-tree.config.ts`** — `'admin.settings.logo': 'admin.settings'`.

## Frontend

### Система префов
6. **`frontend/src/shared/lib/admin/sidebar-ui-prefs.ts`**:
   - тип `AdminLogoVariant = 'classic' | 'mission'`; поле `logoVariant` в `AdminSidebarUiPrefs`, `DEFAULT_...` (`'classic'`), нормализация в `readAdminSidebarUiPrefs`, `prefsEqual`, `updatePrefs`, `mergeSidebarUiPrefsSaved` (по образцу `mobileLayout` — не откатывать локальный `mission`, если старый бэкенд его не сохранил).
   - экспорт `readAdminLogoVariant(): AdminLogoVariant` и хук `useAdminLogoVariant()` — читает localStorage при монтировании и подписывается на `ADMIN_SIDEBAR_UI_PREFS_EVENT` + `storage`.
   - реэкспорт новых сущностей из индекса `@/shared/lib/admin` (как сейчас экспортируется `useAdminSidebarUiPrefs`).
7. **`frontend/src/shared/api/admin-sidebar-ui-prefs.ts`** — `logoVariant` в DTO и `normalizePrefs`.

### Логотип
8. **`AdminPlatformBrand.tsx`** — добавить `'use client'`, хук `useAdminLogoVariant()`, атрибут `data-logo-variant={variant}` на корневом `span`. Применится во всех 3 местах использования (сайдбар `AdminSidebar.tsx:1104`, мобильная шапка `AdminHeader.tsx:1022`, логин `AdminLoginPageView.tsx:88`).
9. **`AdminPlatformBrand.module.css`** — стили варианта:
   ```css
   .brand[data-logo-variant='mission'] .platformTitle {
     font-family: 'great vibes', cursive;
     font-weight: 400;
     text-transform: none;
     letter-spacing: 0;
     font-size: 1.5rem;        /* рукописный читается мельче — увеличиваем */
     line-height: 1.2;
     text-shadow: 0 2px 12px rgb(37 99 235 / 0.35);  /* мягкое свечение вместо «лесенки» */
   }
   ```
   + правки для `mission`-варианта `.platformTitleStacked` (шапка, ~0.875rem), тёмной темы (мягкое свечение `#38bdf8`), и `@media (prefers-reduced-motion)` не трогаем. Цветовая пульсация остаётся. Размеры — стартовые, откалибрую визуально.

### Новая страница настроек
10. **Роут** `frontend/src/app/admin/settings/logo/page.tsx` — реэкспорт вью (по образцу `appearance/page.tsx`).
11. **Вью** `frontend/src/views/admin/Settings/logo/LogoSettingsPageView.tsx` + `LogoSettingsPage.module.css` — по образцу `AppearanceSettingsPageView` (те же cd* chrome-стили, мгновенное применение, `AdminSaveNotice` «Сохранено», подсказка «сохраняется в вашем аккаунте»). Контент: две карточки-превью рядом — «Классический» (домик `Logo markOnly` + «ВИРТУАЛЬНЫЙ ОФИС» в текущем стиле) и «Миссия» (домик + «Виртуальный офис» в Great Vibes); клик по карточке = `updatePrefs({ logoVariant })`, активная карточка подсвечена. Превью рендерятся своими классами, независимо от выбранного варианта.

### Регистрация раздела (4 списка)
12. **`AdminSidebar.tsx`** — дочерний пункт после «Внешний вид админки»: `{ label: 'Настройка логотипа админки', href: '/admin/settings/logo', resourceId: 'admin.settings.logo' }`.
13. **`SettingsHubPageView.tsx`** — запись в `SETTINGS_LINKS` после appearance.
14. **`frontend/src/shared/config/admin-resources.ts`** — запись после `admin.settings.appearance`.
15. **`frontend/src/shared/config/admin-resource-tree.ts`** — `'admin.settings.logo': 'admin.settings'`.

## Проверка

1. Backend: `npm run prisma:migrate` (создаст/применит миграцию) + `npm run prisma:generate`, поднять сервер; `npm run validate` (type-check + lint).
2. Frontend: `npm run dev`, зайти в админку → Настройки → «Настройка логотипа админки»: переключить варианты, убедиться, что логотип в сайдбаре, мобильной шапке и на странице логина меняется мгновенно; проверить тёмную тему; перезагрузить страницу — выбор сохранён (localStorage + сервер); проверить fallback на старом бэкенде (не откатывает выбор).
3. Визуально калибрую размеры Great Vibes (сайдбар/шапка/логин) до аккуратного вида.