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

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 3. Создание супер-администратора

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend node prisma/create-super-admin.cjs
```

По умолчанию: `admin@platform.local` / `Admin123!`  
Переменные: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`

---

## SSL (HTTPS)

### Вариант 1: Let's Encrypt вручную

1. Установите certbot на сервере
2. Получите сертификаты:
   ```bash
   certbot certonly --standalone -d example.com
   ```
3. Скопируйте в проект:
   ```bash
   mkdir -p nginx/ssl
   cp /etc/letsencrypt/live/example.com/fullchain.pem nginx/ssl/
   cp /etc/letsencrypt/live/example.com/privkey.pem nginx/ssl/
   ```
4. Раскомментируйте SSL в `docker-compose.prod.yml`:
   - Порт `443:443` у nginx
   - Volumes для `./nginx/ssl` и `nginx.ssl.conf`
5. Замените основной `nginx.conf` на `nginx.ssl.conf` или настройте HTTP→HTTPS редирект

### Вариант 2: Внешний reverse proxy (Traefik, Caddy, Cloudflare)

Разверните приложение без SSL. Проксируйте порт 80 на nginx. SSL настраивается во внешнем прокси.

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
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Миграции выполняются автоматически при старте backend.

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
