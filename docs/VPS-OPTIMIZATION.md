# Оптимизация VPS для Platform TIR

Рекомендации по выбору параметров VPS и настройке производительности для плавной работы приложения без задержек и зависаний.

## 1. Рекомендуемые характеристики VPS

### Минимальная конфигурация (до 500 посетителей/день, до 10 одновременных пользователей)
| Ресурс | Значение | Примечание |
|--------|----------|------------|
| **CPU** | 2 vCPU | Для NestJS + Next.js + Postgres + ES |
| **RAM** | 4 GB | Критично: Elasticsearch ~512 MB, Postgres ~512 MB, Node.js ×2 ~1.5 GB, ОС ~500 MB |
| **Диск** | 40 GB SSD | NVMe предпочтительнее для БД и Elasticsearch |
| **Сеть** | 100 Mbit/s | Достаточно для типичной нагрузки |

### Рекомендуемая конфигурация (500–3000 посетителей/день, до 50 одновременных)
| Ресурс | Значение |
|--------|----------|
| **CPU** | 4 vCPU |
| **RAM** | 8 GB |
| **Диск** | 80 GB NVMe SSD |
| **Сеть** | 200–500 Mbit/s |

### Для высокой нагрузки (3000+ посетителей)
| Ресурс | Значение |
|--------|----------|
| **CPU** | 6–8 vCPU |
| **RAM** | 12–16 GB |
| **Диск** | 100+ GB NVMe |
| **Сеть** | 500 Mbit/s+ |

---

## 2. Распределение памяти по сервисам

| Сервис | RAM | Обоснование |
|--------|-----|-------------|
| PostgreSQL | 512 MB – 1 GB | Достаточно для каталога товаров и CMS; при >50k записей — 2 GB |
| Elasticsearch | 512 MB – 1 GB | Java heap: 512 MB — минимум, 1 GB — комфортно для поиска |
| Backend (NestJS) | 512 MB – 1 GB | Node.js + Prisma, обработка запросов |
| Frontend (Next.js) | 512 MB – 1 GB | SSR, рендеринг страниц |
| Nginx | 64–128 MB | Очень лёгкий |
| **Система + запас** | ~1 GB | ОС, swap, буферы |

**Итого минимум:** ~3.5 GB для контейнеров + 1 GB система = **4 GB RAM**.

---

## 3. Docker: лимиты и резервации

Файл `docker-compose.prod.yml` расширен секциями `deploy.resources`. Это гарантирует, что один контейнер не съест всю память.

### Режим работы
- **Без `deploy`** — Docker Compose по умолчанию не применяет лимиты в режиме `compose up` (только в Swarm).
- **Через `limits`** — для обычного Compose можно задать `mem_limit` и `cpus` (устаревший синтаксис).
- В `docker-compose.prod.yml` используются `mem_limit` и `cpus` для совместимости с `docker compose up`.

### Проверка использования
```bash
docker stats
```

---

## 4. PostgreSQL: настройки производительности

### Через переменные окружения (docker-compose)

Добавьте в сервис `postgres` в `docker-compose.infra.yml` или `docker-compose.prod.yml`:

```yaml
postgres:
  environment:
    POSTGRES_USER: ...
    POSTGRES_DB: ...
    # Оптимизация (подстройте под объём RAM VPS)
    POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c effective_cache_size=768MB -c work_mem=16MB -c maintenance_work_mem=128MB"
```

**Или** создайте custom conf и смонтируйте его:

```bash
# На сервере: создайте postgres.conf
mkdir -p ~/platform-tir/postgres-config
cat > ~/platform-tir/postgres-config/postgresql.conf << 'EOF'
# Для VPS 4 GB RAM
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB
maintenance_work_mem = 128MB
max_connections = 100
random_page_cost = 1.1
effective_io_concurrency = 200
EOF
```

И в `volumes` postgres:
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./postgres-config/postgresql.conf:/etc/postgresql/postgresql.conf:ro
```

Команда запуска:
```yaml
command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

### Connection pooling (Prisma)

В `DATABASE_URL` можно указать лимит соединений:
```
postgresql://user:pass@host:5432/platform_tir?schema=public&connection_limit=10
```

Prisma по умолчанию использует пул. Рекомендуется `connection_limit=10` для одного инстанса backend, чтобы не исчерпать `max_connections` Postgres.

---

## 5. Elasticsearch: настройки

Текущие `ES_JAVA_OPTS=-Xms512m -Xmx512m` — разумный минимум.

**Для VPS 8 GB RAM** можно увеличить:
```yaml
environment:
  - 'ES_JAVA_OPTS=-Xms1g -Xmx1g'
```

**Важно:** heap не должен превышать 50% RAM контейнера. Для 1 GB heap выделите контейнеру минимум 2 GB (`mem_limit: 2g`).

---

## 6. Nginx: донастройка

Уже настроено: gzip, буферы для SSL, таймауты. Дополнительно можно:

### Кэширование статики Next.js
```nginx
location /_next/static/ {
    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### Увеличение worker_connections при высокой нагрузке
```nginx
events {
    worker_connections 2048;
    use epoll;  # Linux
    multi_accept on;
}
```

---

## 7. Node.js (Backend / Frontend)

### Переменные окружения
- `NODE_OPTIONS=--max-old-space-size=768` — лимит heap для backend (по умолчанию ~1.4 GB на 64-bit).
- Для frontend обычно достаточно стандартных настроек.

### Рекомендации
- Один процесс на сервис — без кластеризации (PM2 cluster) на старте; при росте нагрузки можно рассмотреть несколько инстансов за nginx.

---

## 8. Системные настройки Linux (sysctl)

На сервере Ubuntu/Debian (выполнять с `sudo`):

```bash
# Увеличить лимит открытых файлов
echo "fs.file-max = 65536" | sudo tee -a /etc/sysctl.conf

# Сетевые буферы
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf

# Уменьшить TIME_WAIT для быстрого переиспользования портов
echo "net.ipv4.tcp_fin_timeout = 15" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_tw_reuse = 1" | sudo tee -a /etc/sysctl.conf

sudo sysctl -p
```

### Limits для пользователя Docker
```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

---

## 9. Swap

Для VPS 4 GB рекомендуется 2 GB swap на случай пиков:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

`vm.swappiness=10` — меньше свопить, чаще держать данные в RAM.

---

## 10. Мониторинг

### Быстрая проверка
```bash
# Использование ресурсов контейнерами
docker stats

# Логи при проблемах
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml logs -f frontend
```

### Рекомендуемые метрики
- **RAM:** `free -h`
- **Диск:** `df -h`
- **Нагрузка:** `uptime`
- **PostgreSQL:** `SELECT count(*) FROM pg_stat_activity;` — число активных соединений
- **Elasticsearch:** `curl http://localhost:9200/_cluster/health` (если порт проброшен)

---

## 11. Чек-лист после деплоя

| Действие | Команда / Проверка |
|----------|--------------------|
| Контейнеры запущены | `docker compose ps` |
| Нет OOM | `dmesg \| grep -i oom` (пусто) |
| БД отвечает | `docker compose exec postgres pg_isready -U platform_user` |
| API доступен | `curl -s https://your-domain/api/v1/site-public/config` |
| Поиск работает | Поиск товаров на сайте |
| SSL валиден | Браузер, нет предупреждений |

---

## 12. Типичные проблемы

### Медленная загрузка страниц
- Проверить `proxy_read_timeout`, `proxy_connect_timeout` в nginx.
- Увеличить ресурсы backend/frontend.
- Проверить медленные запросы в Postgres: `pg_stat_statements` (если включён).

### 502 Bad Gateway
- Backend не успел стартовать — увеличить `start_period` в healthcheck.
- Backend падает — смотреть `docker compose logs backend`.

### Out of memory (OOM)
- Увеличить `mem_limit` для критичных контейнеров или RAM VPS.
- Уменьшить `ES_JAVA_OPTS` (heap Elasticsearch).
- Добавить swap как временную меру.

### Медленный поиск
- Проверить, что Elasticsearch индексирует товары.
- Увеличить heap ES до 1 GB при 8 GB RAM на VPS.
