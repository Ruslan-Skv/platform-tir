# Онлайн-собрания (видео-конференции)

Раздел админки «Онлайн-собрания» (`/admin/meetings`): встроенные видеоконференции
сотрудников — видео, аудио, демонстрация экрана, чат и локальная запись.
Архитектура — **mesh WebRTC** по образцу «Удалённой помощи», но многопользовательская:
каждый клиент держит по `RTCPeerConnection` на каждого другого участника.

## Как это работает

- **Транспорт**: WebRTC mesh. Сигналинг (offer/answer/ICE) идёт через socket.io-шлюз
  `/meetings` (`backend/src/admin/meetings/meetings.gateway.ts`), событие `meeting:signal`
  адресное (payload `toUserId`, ретрансляция конкретному сокету).
- **Perfect negotiation**: коллизии offer'ов (оба участника начали переговоры одновременно)
  разрешаются полиролей — «вежливый» пир откатывает свой offer. Роль детерминирована
  с обеих сторон: polite = лексикографически больший userId (`frontend/src/features/meetings/lib/mesh-peer.ts`).
- **Один видеопоток на участника**: камера ИЛИ экран. Переключение — `replaceTrack`
  на существующем сендере без перенегоциации; добавление видео после входа «только
  аудио» — через `onnegotiationneeded`.
- **Комнаты**: состав подключённых — in-memory реестр шлюза (`Map<meetingId, Map<userId, socketId>>`),
  поэтому проверка участия в сигналинге не ходит в БД на каждое ICE-сообщение
  (в отличие от remote-help). Один сокет на пользователя: повторный join (новая вкладка)
  выталкивает старый (`meeting:kicked`).
- **Жизненный цикл**: `SCHEDULED → ACTIVE` (первый вход) `→ ENDED` (последний вышел)
  или `CANCELLED` (автор). Всё пишется в `meetings` / `meeting_participants`.
- **Чат собрания**: эфемерный, через `meeting:chat` — в БД не сохраняется.
- **Запись**: локальная у записывающего — тайлы рисуются на canvas, аудио всех
  участников микшируется через WebAudio → MediaRecorder → скачиваемый `.webm`
  (`frontend/src/features/meetings/lib/meeting-recorder.ts`). Серверной записи нет (нет SFU).

## Сценарий

1. `/admin/meetings` → «+ Собрание» → название, дата/время (опционально — без даты
   начнётся сразу), участники → «Создать и пригласить».
2. Участники получают уведомление в колокольчик + web-push; собрание появляется
   в «Календаре» (тип `meeting`, ссылка ведёт на вход).
3. «Войти в комнату» (или ссылка `/admin/meetings?join={id}` из календаря/уведомления)
   → экран входа → «Войти с видео» / «Только аудио» (клик обязателен — user gesture
   для `getUserMedia`).
4. В комнате: сетка тайлов, микрофон/камера/экран/чат/запись/выход. Напоминание
   «скоро собрание» появляется в колокольчике за 15 минут до начала (вычисляется
   на лету при поллинге фида — планировщик не нужен).

## Роли и доступ

- Ресурс `admin.meetings` дефолтно у ролей ADMIN, CONTENT_MANAGER, MODERATOR,
  SUPPORT, MANAGER, TECHNOLOGIST (как у календаря/мессенджера); SUPER_ADMIN — неявно;
  остальным — выдавать через «Доступ».
- REST `/api/v1/admin/meetings/*` исключён из `AdminResourceInterceptor`
  (`ADMIN_API_SKIPPED_PREFIXES`): роли проверяет контроллер (`@Roles(...ADMIN_ROLES)`),
  участие в собрании и владение (редактирование/отмена — только автор) — сервис.
- Шлюз `/meetings` авторизует JWT в handshake; `meeting:join` проверяет участие
  и статус собрания, сигналы — по in-memory реестру комнаты.

## Ограничения (осознанные)

- **Mesh-масштаб**: у каждого клиента N−1 исходящих потоков. Комфортно 5–6
  участников, жёсткий лимит — 8 (`MEET_MAX_PARTICIPANTS`, по умолчанию 8).
  При 5+ подключённых пирах битрейт видео автоматически снижается до ~300 kbps
  и показывается подсказка выключить камеры.
- **Камера и экран одновременно** не транслируются — одно видео на участника.
- **Запись только локальная** у участника, начинающего запись; чат в запись не
  попадает (только видео+аудио).
- **Повторяющиеся собрания** не поддержаны — создавайте отдельные.
- **Один инстанс backend**: реестр комнат in-memory (как presence). При масштабировании
  на несколько инстансов нужен общий стор (Redis adapter socket.io).
- WebRTC за симметричным NAT требует TURN (см. ниже).

## TURN (опционально)

1. Раскомментируйте сервис `coturn` в `docker-compose.infra.yml` и задайте
   `TURN_USERNAME`/`TURN_CREDENTIAL`.
2. В `.env` бэкенда укажите `TURN_URL=turn:<host>:3478` и те же креды
   (общие с удалённой помощью — `backend/src/common/utils/webrtc-ice.util.ts`).
3. Клиенты получают ICE-конфиг с `GET /api/v1/admin/meetings/ice-servers`
   (STUN Google зашит по умолчанию).

## Переменные окружения

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `MEET_MAX_PARTICIPANTS` | `8` | Максимум одновременных участников (mesh-лимит) |
| `TURN_URL` / `TURN_USERNAME` / `TURN_CREDENTIAL` | — | TURN-сервер (общий с remote-help) |

## Развёртывание

Обязательного для фичи нет ничего, кроме стандартного деплоя:

1. **Миграция** `meetings` / `meeting_participants` / `meeting_bell_events` применяется
   автоматически при старте backend (`prisma migrate deploy`).
2. **nginx**: шлюз ходит через уже настроенный эндпоинт `/socket.io/` (namespace
   передаётся в handshake) — отдельной конфигурации не нужно.

## Ключевые файлы

| Слой | Файлы |
| --- | --- |
| Бэкенд | `backend/src/admin/meetings/` (controller, service, gateway, dto) |
| Схема | `backend/prisma/schema.prisma` — `Meeting`, `MeetingParticipant`, `MeetingBellEvent`, `MeetingStatus` |
| Уведомления | `backend/src/admin/notifications/admin-bell-meetings-feed.service.ts`, push-событие `meeting` |
| Календарь | `backend/src/admin/calendar/calendar.service.ts` — тип `meeting`, `loadMeetings` |
| API-клиент | `frontend/src/shared/api/admin-meetings.ts` (REST + сокет) |
| Фича | `frontend/src/features/meetings/` (mesh-peer, recorder, useMeetingRoom, UI) |
| Страница | `frontend/src/views/admin/Meetings/`, роут `/admin/meetings` |
