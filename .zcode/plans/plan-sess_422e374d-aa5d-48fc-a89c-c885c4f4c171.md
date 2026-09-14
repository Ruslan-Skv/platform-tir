# План: раздел «Мои уведомления» в админке

## Суть
Сегодня переключатели событий (отзывы, заказы, заявки...) доступны только супер-админу на уровне ролей (`/admin/settings/notifications`), а личные настройки (`PATCH admin/notifications/settings/me`) сохраняют только доставку (звук/desktop/интервал) с `deliveryOnly: true`. При этом модель `UserAdminNotificationOverride` уже поддерживает полный набор флагов событий, а push-рассылка (`AdminBellPushService` + `AdminNotificationSettingsReaderService.getSettingsForUser`) уже учитывает персональные настройки. Поэтому доработка минимальна: разрешить каждому админу сохранять свои флаги событий и дать для этого удобный UI.

## Backend

1. **DTO** — расширить `backend/src/admin/notifications/dto/update-my-admin-notification-delivery.dto.ts` опциональными булевыми полями всех 17 событий (`notifyOnReviews`, `notifyOnOrders`, ... `notifyOnFurnitureSchedules`).
2. **Сервис** — в `AdminNotificationsService.updateMyDeliveryPrefs` (`backend/src/admin/notifications/admin-notifications.service.ts:118`): при наличии событий в DTO сохранять и их; `deliveryOnly` = `true` только если события не передавались. Значения флагов берём из `effective` (текущие эффективные настройки), как уже сделано для доставки.
3. **Сброс к роли** — новый эндпоинт `DELETE admin/notifications/settings/me`: удаляет `UserAdminNotificationOverride`, настройки снова берутся из блока роли. Добавить метод в контроллер (`admin-notifications.controller.ts`).
4. **Ресурс-права**: новый раздел должен быть доступен **всем** ролям админки:
   - новый ресурс `admin.settings.my-notifications` (path `/admin/settings/my-notifications`) в `backend/src/admin/admin-access/resources.config.ts` и `admin-resource-tree.config.ts`;
   - включить его по умолчанию для всех ролей в `backend/src/admin/admin-access/role-default-resources.config.ts` (кроме USER/GUEST/TRAINEE — по аналогии с `ADMIN_NOTIFICATION_BELL_ROLES`);
   - проверить маппинг `/api/v1/admin/notifications` в `backend/src/common/config/admin-api-route-resources.config.ts` — персональные эндпоинты (`settings`, `settings/me`, `push/*`, `sounds`, `bell/*`) должны быть доступны обычным ролям (при необходимости отдельный маппинг на новый ресурс).

## Frontend

5. **Страница** — `frontend/src/app/admin/settings/my-notifications/page.tsx` + вью `frontend/src/views/admin/Settings/my-notifications/MyNotificationsPageView.tsx` (переиспользовать `NotificationsSection.module.css`).
   UI (по образцу `NotificationsSection.tsx`, но без роли/super-admin-логики):
   - блок «Доставка»: браузерные уведомления вкл/выкл (с запросом `Notification.requestPermission()`), звук (тип/громкость/свой звук), интервал проверки;
   - статус push-подписки и кнопка «Разрешить уведомления в браузере» через существующий `frontend/src/features/admin-push/useAdminWebPush.ts`;
   - блок «События»: 17 переключателей (отзывы, заказы, чат поддержки, формы, квизы, обучение, путевые листы, графики монтажей/ремонтов/мебели, рабочие дни, обратная связь); значения по умолчанию — унаследованные от роли (из `GET admin/notifications/settings`, который уже возвращает эффективные настройки текущего пользователя);
   - кнопка «Сбросить к настройкам роли» (`DELETE settings/me`).
   Сохранение — `PATCH admin/notifications/settings/me` (расширить клиент `frontend/src/shared/api/admin-notifications.ts`).
   События push-перечня без флагов в модели (`calendar_event`, `messenger_message`, `kanban_card`) — управляются глобально, в UI не показываем (или помечаем подсказкой).
6. **Меню** — добавить `{ id: 'admin.settings.my-notifications', label: 'Мои уведомления', path: '/admin/settings/my-notifications' }` в `frontend/src/shared/config/admin-resources.ts` (раздел «Настройки») и в сайдбар, с проверкой прав через существующий механизм ресурсов.

## Проверка
- Type-check/build frontend и backend.
- Ручная проверка: зайти под не-супер-админом, открыть раздел, выключить событие, убедиться, что `getSettingsForUser` возвращает переопределение (push-фильтрация подхватит автоматически).

## Что не делаем
- Не трогаем движок доставки push/колокольчика — он уже читает персональные настройки.
- Не трогаем внешние каналы (email/Telegram/MAX) — настраиваются глобально супер-админом.