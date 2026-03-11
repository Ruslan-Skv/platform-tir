# Развёртывание Platform TIR в production

## Требования

- Docker и Docker Compose
- Домен (для SSL)
- Сертификаты Let's Encrypt (опционально, для HTTPS)

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
| `API_BASE_URL` | URL бэкенда для ссылок, напр. `https://example.com/api/v1` |
| `POSTGRES_PASSWORD` | **Обязательно** — пароль PostgreSQL |
| `DATABASE_URL` | Connection string БД (должен соответствовать POSTGRES_*) |
| `JWT_SECRET` | **Обязательно** — секрет JWT (минимум 32 символа) |

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

## Несколько доменов (territory-interior.ru + территория-интерьерных-решений.рф)

Для двух доменов, указывающих на один сервер:

1. **NEXT_PUBLIC_API_URL** — используйте относительный путь `/api/v1`, чтобы API работало с обоих доменов без CORS.
2. **CORS_ORIGIN** — укажите оба домена (кириллический — в Punycode):
   ```bash
   node -e "console.log(require('url').domainToASCII('территория-интерьерных-решений.рф'))"
   # → xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai
   ```
   ```
   CORS_ORIGIN=https://territory-interior.ru,https://xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai
   ```
3. Готовый шаблон: `cp .env.production.example .env`

---

## SSL (HTTPS)

### Вариант 1: Let's Encrypt вручную

1. Установите certbot на сервере
2. Получите сертификаты (для обоих доменов):
   ```bash
   certbot certonly --standalone -d territory-interior.ru -d xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai
   ```
   Или по отдельности, если certbot не поддерживает несколько -d.
3. Скопируйте в проект:
   ```bash
   mkdir -p nginx/ssl
   cp /etc/letsencrypt/live/territory-interior.ru/fullchain.pem nginx/ssl/
   cp /etc/letsencrypt/live/territory-interior.ru/privkey.pem nginx/ssl/
   ```
4. Раскомментируйте SSL в `docker-compose.prod.yml`:
   - Порт `443:443` у nginx
   - Volumes для `./nginx/ssl` и `nginx.ssl.conf`
5. Замените основной `nginx.conf` на `nginx.ssl.conf` или настройте HTTP→HTTPS редирект

### Вариант 2: Внешний reverse proxy (Traefik, Caddy, Cloudflare)

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

```bash
git pull
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml up -d
```

Образы пересобираются в GitHub Actions при push в `main`. Миграции выполняются автоматически при старте backend.

---

## Volumes и данные

| Volume | Назначение |
|--------|------------|
| `postgres_data` | Данные PostgreSQL |
| `elasticsearch_data` | Индексы Elasticsearch |
| `backend_uploads` | Загруженные файлы (изображения и т.д.) |

Рекомендуется настроить резервное копирование `postgres_data` и `backend_uploads`.

---

## Проверка работоспособности

- Главная: `http://your-server/`
- API health: `http://your-server/api/v1/site-public/config`
- Swagger: `http://your-server/api/v1/docs` (в production можно отключить)

---

## Устранение неполадок

### Backend не стартует
- Проверьте `DATABASE_URL` и доступность PostgreSQL
- Проверьте логи: `docker compose logs backend`

### CORS-ошибки
- Убедитесь, что `CORS_ORIGIN` в `.env` совпадает с доменом, с которого открывается сайт
- Для нескольких доменов: `CORS_ORIGIN=https://example.com,https://www.example.com`

### 502 Bad Gateway
- Backend ещё не готов — проверьте `docker compose ps` и healthcheck
- Увеличьте `start_period` в healthcheck при медленном сервере
