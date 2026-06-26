# Развёртывание Platform TIR в production

## Требования

- Docker и Docker Compose
- **Миграция на новый сервер:** см. [docs/MIGRATION-REG-TO-TIMEWEB.md](docs/MIGRATION-REG-TO-TIMEWEB.md)
- Домен (для SSL)
- Сертификаты Let's Encrypt (опционально, для HTTPS)
- **VPS:** рекомендуется минимум 4 GB RAM, 2 vCPU. См. [docs/VPS-OPTIMIZATION.md](docs/VPS-OPTIMIZATION.md) для подбора параметров и оптимизации производительности.

---

## Быстрый старт

### 1. Подготовка переменных окружения

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите:

| Переменная | Описание |
|------------|----------|
| `SITE_URL` | Публичный URL сайта, напр. `https://example.com` |
| `NEXT_PUBLIC_API_URL` | URL API для браузера, напр. `https://example.com/api/v1` |
| `CORS_ORIGIN` | Разрешённый origin (через запятую), напр. `https://example.com` |
| `API_BASE_URL` | URL бэкенда, напр. `https://example.com/api/v1`. Для картинок /uploads/ суффикс /api/v1 убирается автоматически |
| `POSTGRES_PASSWORD` | **Обязательно** — пароль PostgreSQL |
| `DATABASE_URL` | Connection string БД (должен соответствовать POSTGRES_*) |
| `JWT_SECRET` | **Обязательно** — секрет JWT (минимум 32 символа) |
| `SITE_URL` | **Для писем** — публичный URL (восстановление пароля, ссылки в письмах заказов) |
| `MAIL_FROM`, `SMTP_*` | Отправка email (восстановление пароля, заказы). Без SMTP письма не отправятся |
| `YANDEX_CLIENT_ID` | Client ID из приложения Яндекс ID (для входа через Яндекс) |
| `YANDEX_CLIENT_SECRET` | Client secret приложения Яндекс ID |

**Вход через Яндекс ID:** см. раздел [«Настройка Yandex OAuth»](#настройка-yandex-oauth) ниже.

Сгенерировать JWT_SECRET:
```bash
openssl rand -hex 32
```

### 2. Запуск

**Вариант A: Образы из GitHub Actions (рекомендуется для VPS)**

Образы собираются при push в `main` и публикуются в GitHub Container Registry. На сервере только pull:

```bash
# После push в main — дождаться успешного завершения workflow в Actions
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml up -d
```

Используется `docker-compose.infra.yml` (вместо `docker-compose.yml`), чтобы не тянуть конфигурацию с `build` — иначе Compose попытается собрать образы.

Если репозиторий в другой организации: `GHCR_IMAGE_PREFIX=ghcr.io/your-username docker compose ...`

**Вариант B: Сборка на сервере** (если CI недоступен)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

(Соберёт образы и присвоит им теги из `image:`.)

### 3. Создание супер-администратора

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml exec backend node prisma/create-super-admin.cjs
```

По умолчанию: `admin@platform.local` / `Admin123!`  
Переменные: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`

---

## Настройка Yandex OAuth

Если при нажатии «Войти через Яндекс» появляется «Вход через Яндекс временно недоступен» или `GET /api/v1/auth/yandex` возвращает 400:

### 1. Переменные окружения

Убедитесь, что в `.env` указаны и переданы в backend:

```
SITE_URL=https://territory-interior.ru
YANDEX_CLIENT_ID=<Client ID из панели>
YANDEX_CLIENT_SECRET=<Client secret>
```

Без `YANDEX_CLIENT_ID` бэкенд возвращает 400. `docker-compose.prod.yml` передаёт эти переменные в backend.

### 2. Регистрация приложения в Яндекс OAuth

1. Перейдите на [oauth.yandex.com](https://oauth.yandex.com/) и войдите в аккаунт.
2. [Создайте приложение](https://oauth.yandex.com/client/new/id).
3. **Платформа:** выберите **Web services**.
4. **Redirect URI** — укажите **точно** (без слэша в конце):
   ```
   https://territory-interior.ru/auth/yandex/callback
   ```
   Для кириллического домена добавьте второй URI:
   ```
   https://xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai/auth/yandex/callback
   ```
5. **Права доступа:** включите «Яндекс ID» → имя, email, аватар (нужно для входа).
6. Сохраните приложение. Скопируйте **Client ID** и **Client secret**.

### 3. Статус «НЕ подключен» в личном кабинете Яндекс ID

В [id.yandex.ru](https://id.yandex.ru) → «Приложения с доступом к аккаунту» приложение может показывать «НЕ подключен», пока вы не выполнили хотя бы один вход через него. После успешной авторизации статус изменится.

### 4. Перезапуск после изменений

После добавления переменных в `.env`:
```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml up -d
```

---

## Сессии и `/auth/refresh` (401 в консоли)

Access-токен хранится в `localStorage`, refresh — в httpOnly cookie `rt` (path `/api/v1/auth`, `Secure` в production).

После деплоя с новой схемой авторизации пользователям с **старыми** токенами в браузере нужно **выйти и войти снова** — иначе в консоли будут 401 на `POST /api/v1/auth/refresh` (cookie `rt` нет или сессия в БД отозвана).

Проверка на сервере:

| Что проверить | Значение |
|---------------|----------|
| `CORS_ORIGIN` | `https://territory-interior.ru` (+ зеркала при необходимости) |
| `REFRESH_COOKIE_SECURE` | `true` при HTTPS |
| `REFRESH_COOKIE_DOMAIN` | пусто или `.territory-interior.ru` (не ставить, если сомневаетесь) |
| `NEXT_PUBLIC_API_URL` при сборке frontend | `/api/v1` (относительный, см. GitHub Actions) |
| Миграции | `docker compose … exec backend npx prisma migrate deploy` |

После входа в DevTools → Application → Cookies → `territory-interior.ru` должна появиться cookie `rt` с path `/api/v1/auth`.

---

## Несколько доменов и зеркалирование

**Основной домен:** territory-interior.ru  
**Зеркала (301 → основной):** территория-интерьерных-решений.рф, 601270.ru

1. **NEXT_PUBLIC_API_URL** — относительный путь `/api/v1`.
2. **CORS_ORIGIN** — все домены (на случай запросов до редиректа):
   ```
   CORS_ORIGIN=https://territory-interior.ru,https://xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai,https://601270.ru
   ```
3. **SSL:** все домены должны быть в сертификате Let's Encrypt. При первом запуске `setup-ssl.sh` включает все три. Для добавления 601270.ru к уже существующему сертификату:
   ```bash
   chmod +x scripts/expand-ssl-domains.sh
   ./scripts/expand-ssl-domains.sh
   ```
4. **DNS:** A-записи всех доменов должны указывать на IP сервера.
5. Готовый шаблон: `cp .env.production.example .env`

### Квиз «Мебель на заказ» (отдельный домен)

**Домен лендинга:** mebel-na-zakaz-51.ru (не редиректится на основной сайт).

1. **DNS:** A-запись `mebel-na-zakaz-51.ru` → IP сервера.
2. **CORS_ORIGIN** — добавьте домен квиза:
   ```
   CORS_ORIGIN=https://territory-interior.ru,...,https://mebel-na-zakaz-51.ru
   ```
3. **QUIZ_DOMAINS** и **NEXT_PUBLIC_QUIZ_DOMAINS** — `mebel-na-zakaz-51.ru` (см. `.env.example`).
4. **SSL:** включите домен в сертификат (`scripts/expand-ssl-domains.sh` или certbot `-d mebel-na-zakaz-51.ru`).
5. **nginx:** в `nginx/nginx-ssl.conf` есть `server_name mebel-na-zakaz-51.ru` → тот же frontend/backend.
6. **Админка:** раздел «Квизы → Мебель» (`/admin/quiz/mebel`) — тексты, шаги, уведомления, заявки.
7. **Реклама на кухни:** ссылка с `?type=kitchen` пропускает шаг выбора типа мебели.

Локальная проверка: `http://localhost:3000/quiz` или `http://localhost:3000/quiz?type=kitchen`.

### Квиз «Ремонт и отделка» (отдельный домен)

**Домен лендинга:** remont-kvartir-51.ru.

1. **DNS:** A-запись `remont-kvartir-51.ru` → IP сервера.
2. **CORS_ORIGIN** — добавьте `https://remont-kvartir-51.ru`.
3. **QUIZ_DOMAINS** и **NEXT_PUBLIC_QUIZ_DOMAINS** — через запятую с доменом мебели: `mebel-na-zakaz-51.ru,remont-kvartir-51.ru`.
4. **SSL:** certbot `-d remont-kvartir-51.ru` или `scripts/expand-ssl-domains.sh`.
5. **nginx:** `server_name remont-kvartir-51.ru` в `nginx/nginx-ssl.conf`.
6. **Seed:** `npm run prisma:seed` (создаёт квиз `remont` с шагами и ветвлением по направлениям).
7. **Админка:** «Квизы → Ремонт» (`/admin/quiz/remont`) — направления, шаги, заявки.
8. **Реклама по направлению:** `?type=repair|windows|doors|ceilings|blinds|furniture` пропускает первый шаг.

---

## SSL (HTTPS)

### Автоматическая настройка (рекомендуется)

На сервере в `~/platform-tir`:

```bash
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

Скрипт: останавливает nginx → получает сертификаты Let's Encrypt → копирует в `nginx/ssl/` → запускает nginx с SSL.

### Ручная настройка

1. Остановить nginx: `docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml stop nginx`
2. Получить сертификаты:
   ```bash
   sudo apt-get install -y certbot
   sudo certbot certonly --standalone -d territory-interior.ru -d xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai --non-interactive --agree-tos --email admin@territory-interior.ru
   ```
3. Скопировать в проект:
   ```bash
   mkdir -p nginx/ssl
   sudo cp /etc/letsencrypt/live/territory-interior.ru/fullchain.pem nginx/ssl/
   sudo cp /etc/letsencrypt/live/territory-interior.ru/privkey.pem nginx/ssl/
   sudo chown $(whoami) nginx/ssl/*.pem
   ```
4. Запустить с SSL:
   ```bash
   docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d
   ```

### Обновление сертификатов

Let's Encrypt выдаёт сертификаты на 90 дней. Certbot работает в режиме **standalone** (занимает порт 80), поэтому перед обновлением нужно останавливать Docker nginx.

Добавьте в crontab (`crontab -e`):

```
0 3 * * * /home/ruslan/platform-tir/scripts/renew-ssl.sh >> /home/ruslan/platform-tir/logs/renew-ssl.log 2>&1
```

Проверка (на сервере, ~1 мин простоя сайта):

```bash
cd ~/platform-tir
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml stop nginx
sudo certbot renew --dry-run
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d nginx
```

**Не используйте** `certbot --nginx` / `python3-certbot-nginx`: nginx работает в Docker, а не на хосте.

### Вариант: внешний reverse proxy (Traefik, Caddy, Cloudflare)

Разверните приложение без SSL. Проксируйте порт 80 на nginx. SSL настраивается во внешнем прокси.

---

## GitHub Actions: сборка образов

При каждом push в `main` workflow `.github/workflows/docker-publish.yml`:

1. Собирает backend, frontend, nginx
2. Публикует в `ghcr.io/<owner>/platform-tir-*:latest`
3. Первый запуск: вкладка **Actions** → выбрать workflow → **Run workflow**

После успешного выполнения образы доступны на сервере через `docker compose ... pull`.  
Если репозиторий приватный: GitHub → Packages → нужный образ → Package settings → Change visibility → Public.

---

## Архитектура production

```
                    ┌─────────────┐
                    │   nginx     │  :80 (опционально :443)
                    │  (reverse   │
                    │   proxy)    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  frontend   │ │   backend   │ │  /uploads/  │
    │   :3000     │ │   :3001     │ │  → backend  │
    └─────────────┘ └──────┬──────┘ └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────────┐ (Elasticsearch)
       │ postgres │ │elasticsearch │
       └──────────┘ └──────────────┘
```

- PostgreSQL, Elasticsearch, backend, frontend **не** доступны снаружи (порты не публикуются)
- Единственная точка входа — nginx (порт 80, опционально 443)

---

## Обновление приложения

Данные в БД, загрузки и volumes **сохраняются** — обновляются только образы и код.

```bash
cd ~/platform-tir
git pull
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml pull
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d
```

*Без SSL уберите `-f docker-compose.ssl.yml` из команд.*

Миграции Prisma выполняются автоматически при старте backend (`prisma migrate deploy`).

---

## Обслуживание и доработка

### Файлы compose

| Режим | Файлы |
|-------|-------|
| С SSL | `-f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml` |
| Без SSL | `-f docker-compose.infra.yml -f docker-compose.prod.yml` |

### Алиас для удобства

Добавьте в `~/.bashrc` (на сервере):

```bash
alias dc='docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml'
```

После `source ~/.bashrc` можно вызывать `dc pull`, `dc up -d`, `dc logs backend` и т.д.

### Обновление приложения (порядок действий)

| Шаг | Действие | Сохранность данных |
|-----|----------|--------------------|
| 1 | `git pull` | — |
| 2 | `docker compose ... pull` | ✅ Volumes не трогаются |
| 3 | `docker compose ... up -d` | ✅ БД, uploads, индексы сохраняются |
| 4 | `docker image prune -f` | ✅ Удаляет только висячие образы `<none>`; запущенные контейнеры не трогает |

После каждого `pull` с тегом `latest` предыдущие слои остаются без тега и могут занимать много места в `/var/lib/docker`. Шаг 4 освобождает этот объём.

```bash
docker image prune -f
```

**Важно:** не используйте `down -v` — флаг `-v` удаляет volumes и данные.

### Переменные окружения (.env)

Переменные для production берутся из **корневого** `.env` (рядом с `docker-compose.yml`). Docker Compose автоматически загружает его при запуске. Запускайте команды из корня проекта:

```bash
cd ~/platform-tir   # или путь к проекту
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml up -d
```

Проверьте, что `.env` содержит `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `SITE_URL` и другие нужные переменные.

### Изменение .env (пароли, CORS, домены)

`restart` не подхватывает новые переменные. Нужно пересоздать контейнеры:

```bash
docker compose ... up -d
```

Compose пересоздаст контейнеры с обновлённым `.env`. После изменения суперадмина:

```bash
docker compose ... up -d backend
docker compose ... exec backend node prisma/create-super-admin.cjs
```

### Перезапуск приложения

| Ситуация | Команда |
|----------|---------|
| Временный сбой | `docker compose ... restart backend` (или frontend, nginx) |
| Новые переменные из .env | `docker compose ... up -d` |
| Обновление образа (после pull) | `docker compose ... up -d` |
| Полная перезагрузка стека | `docker compose ... down` затем `up -d` |

**Порядок старта:** postgres → elasticsearch → backend → frontend → nginx (Compose соблюдает `depends_on`).

### Внутренний мониторинг (Uptime Kuma)

Отдельный контейнер из [`docker-compose.monitoring.yml`](docker-compose.monitoring.yml): проверка доступности сайта и API, уведомления (email и др.). Он **не входит** в основной стек (`docker-compose.infra.yml` + `docker-compose.prod.yml`), поэтому типичный деплой приложения этот сервис **не трогает**.

#### Первый запуск (один раз)

Из корня репозитория на сервере:

```bash
cd ~/platform-tir
docker compose -f docker-compose.monitoring.yml up -d
```

Панель по умолчанию слушает только **localhost** (**127.0.0.1:3002**). Доступ с вашего компьютера без открытия порта в интернет:

```bash
ssh -L 3002:127.0.0.1:3002 user@IP_СЕРВЕРА
```

В браузере: `http://127.0.0.1:3002`. Настройка мониторов и SMTP — в интерфейсе Kuma (см. комментарии в начале `docker-compose.monitoring.yml`).

#### Повседневная работа и деплой

| Действие | Нужно ли что-то делать с Kuma |
|----------|-------------------------------|
| `git pull`, `dc pull`, `dc up -d` (обновление приложения) | **Нет** |
| `dc restart backend` / `frontend` / `nginx` | **Нет** |
| Перезагрузка VPS | Обычно **нет**: у сервиса задано `restart: unless-stopped` |

Повторно вызывать `docker compose -f docker-compose.monitoring.yml up -d` нужно только если вы меняли этот compose-файл, обновляете образ Kuma или поднимаете мониторинг после удаления контейнера.

#### Предупреждение `Found orphan containers ([uptime-kuma])`

При `dc up -d` Compose может сообщить, что контейнер `uptime-kuma` — «сирота» относительно **текущего** набора compose-файлов. Так и задумано: мониторинг описан в другом файле, на работу стека это **не влияет**. **Не добавляйте** к основному деплою флаг `--remove-orphans`, если не хотите удалить контейнер мониторинга.

#### Обновление образа и перезапуск только Kuma

```bash
docker compose -f docker-compose.monitoring.yml pull
docker compose -f docker-compose.monitoring.yml up -d
```

Если нужно перезапустить только контейнер без обновления образа:

```bash
docker restart uptime-kuma
```

Настройки и история проверок хранятся в Docker volume (в compose — `uptime-kuma-data`); при обычных перезапусках приложения они **сохраняются**.

### Ручное применение миграций

Обычно не требуется — backend при старте выполняет `prisma migrate deploy`. Если нужно:

```bash
docker compose ... exec backend npx prisma migrate deploy
```

### Резервное копирование

**Автоматическое** (скрипт + cron):

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh   # проверка
```

Добавить в crontab (`crontab -e`), например ежедневно в 2:00:

```
0 2 * * * /home/ruslan/platform-tir/scripts/backup.sh >> /home/ruslan/platform-tir/backups/backup.log 2>&1
```

*Перед добавлением в cron выполните `./scripts/backup.sh` вручную — создастся каталог `backups/`.*

Бэкапы сохраняются в `backups/`. Старше 7 дней — удаляются автоматически.

**Мониторинг диска и очистка:** см. [docs/VPS-OPTIMIZATION.md](docs/VPS-OPTIMIZATION.md) — скрипты `disk-monitor.sh` (оповещения на email при 80%+) и `cleanup-disk.sh` (еженедельная очистка Docker, логов).

**Ручное** (перед крупными обновлениями):

```bash
./scripts/backup.sh
```

### Цикл разработка → публикация

1. **Локально:** вносите изменения, тестируете
2. **Миграции:** `cd backend && npx prisma migrate dev --name описание`
3. **Push в main:** `git push`
4. **GitHub Actions:** собирает образы и пушит в GHCR
5. **На сервере:** `git pull` → `dc pull` → `dc up -d`
6. Миграции применяются при старте backend (в т.ч. индексы каталога — см. [docs/CATALOG.md](docs/CATALOG.md))

### Чего избегать

- `docker compose down -v` — удаляет volumes и данные БД
- `docker volume rm` для `postgres_data`, `backend_uploads`
- Сборка на сервере (`--build`) — долго; используйте образы из GHCR

---

## Volumes и данные

| Volume | Назначение |
|--------|------------|
| `postgres_data` | Данные PostgreSQL |
| `elasticsearch_data` | Индексы Elasticsearch |
| `backend_uploads` | Загруженные файлы (изображения и т.д.) |

Резервное копирование: `scripts/backup.sh` (см. раздел выше).

---

## Проверка работоспособности

- Главная: `http://your-server/`
- API health: `http://your-server/api/v1/site-public/config`
- Swagger: `http://your-server/api/v1/docs` (в production можно отключить)
- Каталог товаров (архитектура, API, чеклист после деплоя): [docs/CATALOG.md](docs/CATALOG.md)

---

## Устранение неполадок

### Backend не стартует
- Проверьте `DATABASE_URL` и доступность PostgreSQL
- Проверьте логи: `docker compose logs backend`

### CORS-ошибки
- Убедитесь, что `CORS_ORIGIN` в `.env` совпадает с доменом, с которого открывается сайт
- Для нескольких доменов: `CORS_ORIGIN=https://example.com,https://www.example.com`

### Вход через Яндекс: 400 или «Временно недоступен»
- Добавьте `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `SITE_URL` в `.env` и перезапустите backend
- Redirect URI в приложении Яндекс OAuth должен **точно** совпадать с `{SITE_URL}/auth/yandex/callback`
- См. [«Настройка Yandex OAuth»](#настройка-yandex-oauth)

### 413 Request Entity Too Large (создание/редактирование товара)
Ошибка при отправке формы товара с несколькими или крупными изображениями (body запроса превышает лимит nginx).

**Решение:** В конфигах nginx уже задано `client_max_body_size 25m;` (в `nginx/nginx.conf` и `nginx/nginx-ssl.conf`). После обновления конфигов перезапустите nginx:

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml restart nginx
```

При использовании SSL: `docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml restart nginx`

### 502 Bad Gateway
- Backend ещё не готов — проверьте `docker compose ps` и healthcheck
- Увеличьте `start_period` в healthcheck при медленном сервере

### Backend unhealthy, контейнер backend не запускается
Backend выполняет `prisma migrate deploy` при старте. Если миграция в БД помечена как failed (P3009), deploy прерывается и контейнер падает.

**Решение 1 — пометить failed-миграцию как применённую (если схема уже есть):**
```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml run --rm backend npx prisma migrate resolve --applied 20240101_000000_init
```
Затем перезапустите:
```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml up -d
```

**Решение 2 — миграция упала из‑за «No space left on device»:**
1. Освободите место на диске: `df -h`, `docker system prune`, `docker image prune -a`
2. Проверьте, создана ли таблица:  
   `docker compose ... exec postgres psql -U platform_user -d platform_tir -c "\dt admin_resource_role*"`
3. Если таблица есть:  
   `npx prisma migrate resolve --applied 20250319_000000_add_admin_resource_role_permissions`
4. Если таблицы нет:  
   `npx prisma migrate resolve --rolled-back 20250319_000000_add_admin_resource_role_permissions`  
   затем `dc up -d` — миграция применится повторно.

**Решение 3 — принудительно синхронизировать схему (миграции не используются):**
```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml run --rm backend npx prisma db push
```
После этого снова `dc up -d`. При следующем деплое миграции могут конфликтовать; предпочтительно использовать Решение 1.

**Просмотр логов backend:**
```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml logs backend
```

### Ошибка `products.createdById does not exist`
Схема БД не совпадает с Prisma. Нужно применить миграции:

```bash
docker compose ... exec backend npx prisma migrate deploy
```

Если миграции уже применены, проверьте, что последний деплой содержит папку `backend/prisma/migrations/` с нужными миграциями (в т.ч. `20250317_000000_add_product_created_by_updated_by`, `20250319_000000_add_admin_resource_role_permissions`).

### ERR_HTTP2_PROTOCOL_ERROR, Failed to load chunk
Ошибка возникает при загрузке статики Next.js (`/_next/static/chunks/*.js`, `*.css`) через nginx с HTTP/2.

**Причина:** Несовместимость HTTP/2 в nginx с проксированием к Node.js при множественных параллельных запросах chunks.

**Решение:** В `nginx/nginx-ssl.conf` уже отключён HTTP/2 (`listen 443 ssl` вместо `listen 443 ssl http2`). Если проблема осталась:
1. Убедитесь, что на сервере развёрнута актуальная версия конфига (с отключённым HTTP/2)
2. Перезапустите nginx: `docker compose ... restart nginx`
3. Очистите кэш браузера и попробуйте в режиме инкогнито

**При использовании Cloudflare:** проверьте SSL/TLS режим (Full или Full Strict), отключите HTTP/2 на время диагностики в настройках Cloudflare.
