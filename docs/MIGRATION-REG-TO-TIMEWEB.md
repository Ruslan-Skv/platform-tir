# Миграция Platform TIR с Reg.ru VPS на Timeweb Cloud

Пошаговая инструкция переноса приложения на новый VPS.

## Исходные данные

| Параметр | Значение |
|----------|----------|
| **Старый сервер** | Reg.ru VPS |
| **Новый сервер** | Timeweb Cloud VPS |
| **Новый сервер** | Ubuntu 24.04, 4 CPU, 8 GB RAM, 80 GB NVMe |
| **Домены** | territory-interior.ru, территория-интерьерных-решений.рф |
| **DNS** | Обновлены на Reg.ru → указывают на IP нового сервера |

---

## Часть 1. Подготовка на СТАРОМ сервере (Reg.ru)

### 1.1. Создание резервной копии

Подключитесь по SSH к старому серверу и выполните:

```bash
cd ~/platform-tir   # или путь к проекту

# Создать финальный бэкап
./scripts/backup.sh
```

Бэкапы сохранятся в `backups/`:
- `postgres_YYYYMMDD_HHMM.sql` — дамп PostgreSQL (включая товары, заказы, пользователей)
- `uploads_YYYYMMDD_HHMM.tar.gz` — загруженные файлы (изображения товаров и т.д.)

### 1.2. Скачивание бэкапов на локальную машину

С вашего ПК (не с сервера):

```bash
# Замените OLD_SERVER и USER на данные старого сервера
scp USER@OLD_SERVER_IP:~/platform-tir/backups/postgres_*.sql ./migration-backup/
scp USER@OLD_SERVER_IP:~/platform-tir/backups/uploads_*.tar.gz ./migration-backup/
```

**Альтернатива** — передать напрямую на новый сервер:

```bash
# С нового сервера — скачать со старого
scp USER@OLD_SERVER_IP:~/platform-tir/backups/postgres_*.sql ~/
scp USER@OLD_SERVER_IP:~/platform-tir/backups/uploads_*.tar.gz ~/
```

### 1.3. Сохранение .env со старого сервера

Важно сохранить переменные окружения (пароли, JWT_SECRET, SMTP, Yandex OAuth и т.д.):

```bash
# Со старого сервера
scp USER@OLD_SERVER_IP:~/platform-tir/.env ./migration-backup/.env.old
```

**Внимание:** `JWT_SECRET` и `POSTGRES_PASSWORD` можно оставить теми же при переносе — тогда сессии пользователей и доступ к БД сохранятся. Или сгенерировать новые (но тогда все пользователи должны войти заново).

---

## Часть 2. Настройка НОВОГО сервера (Timeweb Cloud)

### 2.1. Базовая настройка Ubuntu

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw
```

### 2.2. Пользователь (если ещё не создан)

Если вы уже создали пользователя — пропустите. Иначе:

```bash
sudo adduser youruser
sudo usermod -aG sudo youruser
sudo usermod -aG docker youruser   # для Docker
```

### 2.3. Swap (рекомендуется для 8 GB RAM)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2.4. Системные лимиты (опционально)

```bash
echo "fs.file-max = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2.5. Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## Часть 3. Клонирование проекта и настройка

### 3.1. Клонирование репозитория

```bash
cd ~
git clone https://github.com/YOUR_ORG/platform-tir.git
# или: git clone git@github.com:YOUR_ORG/platform-tir.git
cd platform-tir
```

### 3.2. Настройка .env

```bash
cp .env.production.example .env
nano .env   # или vim, code и т.д.
```

Заполните обязательные поля:

| Переменная | Действие |
|------------|----------|
| `POSTGRES_PASSWORD` | Новый пароль или тот же, что на старом сервере |
| `JWT_SECRET` | `openssl rand -hex 32` или скопировать из старого .env |
| `DATABASE_URL` | Подставьте тот же `POSTGRES_PASSWORD` в строку |
| `CORS_ORIGIN` | Оставить для двух доменов (латиница + Punycode) |
| `SITE_URL`, `API_BASE_URL` | `https://territory-interior.ru` |
| `MAIL_FROM`, `SMTP_*` | Данные почты (как на старом) |
| `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` | Скопировать со старого .env |
| `GHCR_IMAGE_PREFIX` | `ghcr.io/ruslan-skv` (или ваш namespace) |

### 3.3. Копирование конфигов nginx

Убедитесь, что в репозитории есть:
- `nginx/nginx.conf` — для HTTP
- `nginx/nginx-ssl.conf` — для HTTPS (после получения SSL)

---

## Часть 4. Первый запуск (без восстановления данных)

Запустите контейнеры «с нуля», чтобы создать volumes и проверить работу:

```bash
cd ~/platform-tir

# Скачать образы
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml pull

# Запустить
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml up -d

# Дождаться запуска (30–60 сек)
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml ps
```

Проверьте, что все контейнеры в статусе `healthy` или `running`.

---

## Часть 5. Восстановление данных

### 5.1. Остановка backend (чтобы не было обращений к БД)

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml stop backend frontend nginx
```

### 5.2. Восстановление PostgreSQL

Укажите путь к вашему файлу бэкапа (из `backups/` или `~/`):

```bash
# Замените postgres_YYYYMMDD_HHMM.sql на ваш файл
BACKUP_FILE=~/postgres_20250321_0200.sql   # пример

docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml exec -T postgres \
  psql -U platform_user -d platform_tir < "$BACKUP_FILE"
```

Если БД только что создана и пустая — restore пройдёт без ошибок. Если возникнет конфликт (например, таблицы уже есть) — возможно, потребуется сначала сбросить БД:

```bash
# ВНИМАНИЕ: только для чистой миграции, удалит все текущие данные
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml exec postgres \
  psql -U platform_user -d postgres -c "DROP DATABASE IF EXISTS platform_tir;"
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml exec postgres \
  psql -U platform_user -d postgres -c "CREATE DATABASE platform_tir;"
# Затем снова restore
```

### 5.3. Восстановление загрузок (uploads)

**Вариант A — скрипт** (рекомендуется):

```bash
chmod +x scripts/restore-backup.sh
./scripts/restore-backup.sh ~/postgres_20250321_0200.sql ~/uploads_20250321_0200.tar.gz
```

Скрипт восстановит PostgreSQL, uploads и запустит приложение.

**Вариант B — вручную:**

```bash
# Укажите путь к архиву uploads
UPLOADS_BACKUP=~/uploads_20250321_0200.tar.gz

# Имя volume (проверить: docker volume ls | grep backend_uploads)
VOLUME_NAME="platform-tir_backend_uploads"

docker run --rm -v "${VOLUME_NAME}:/target" -v "$(pwd)":/backup alpine \
  sh -c "cd /target && tar -xzf /backup/$(basename $UPLOADS_BACKUP) --strip-components=1"
```

### 5.4. Запуск backend, frontend, nginx

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml up -d
```

### 5.5. Реиндексация Elasticsearch (поиск товаров)

После восстановления PostgreSQL индекс Elasticsearch пуст. Выполните переиндексацию:

```bash
# Войдите в админку под суперадмином, откройте консоль браузера (F12) и выполните:
# Или используйте curl с JWT-токеном после входа

curl -X POST "https://territory-interior.ru/api/v1/admin/catalog/products/reindex-elasticsearch" \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН" \
  -H "Content-Type: application/json"
```

Ответ: `{"indexed": 150, "errors": 0}` — количество проиндексированных товаров.

**Как получить JWT:** войдите на сайт через браузер → DevTools → Application → Cookies → скопируйте значение `auth_token` или аналогичного.

---

## Часть 6. SSL (HTTPS)

После того как сайт отвечает по HTTP:

```bash
cd ~/platform-tir
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

Скрипт получит сертификаты Let's Encrypt и настроит nginx. Затем запустите с SSL:

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d
```

### Обновление сертификатов (cron)

```bash
crontab -e
# Добавить:
0 3 * * * /home/ВАШ_ЮЗЕР/platform-tir/scripts/renew-ssl.sh
```

---

## Часть 7. Супер-администратор

Если пользователи из бэкапа — войдут со старыми учётными данными. Суперадмина можно обновить:

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml exec backend \
  node prisma/create-super-admin.cjs
```

---

## Часть 8. Автоматизация (cron)

### Резервное копирование (ежедневно в 2:00)

```bash
chmod +x ~/platform-tir/scripts/backup.sh
crontab -e
# Добавить (замените youruser):
0 2 * * * /home/youruser/platform-tir/scripts/backup.sh >> /home/youruser/platform-tir/backups/backup.log 2>&1
```

### Мониторинг диска (опционально)

В `.env` добавьте `DISK_ALERT_EMAIL=ваш@email.com` и настройте SMTP. Затем:

```bash
chmod +x ~/platform-tir/scripts/disk-monitor.sh
# В crontab — каждые 6 часов:
0 */6 * * * /home/youruser/platform-tir/scripts/disk-monitor.sh
```

### Очистка диска (еженедельно)

```bash
chmod +x ~/platform-tir/scripts/cleanup-disk.sh
# В crontab — воскресенье 3:00:
0 3 * * 0 /home/youruser/platform-tir/scripts/cleanup-disk.sh
```

---

## Часть 9. Проверка

| Проверка | Команда / Действие |
|----------|--------------------|
| Контейнеры | `docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml ps` |
| API | `curl -s https://territory-interior.ru/api/v1/site-public/config` |
| Главная | Открыть https://territory-interior.ru |
| Админка | https://territory-interior.ru/admin |
| Каталог товаров | Проверить отображение товаров |
| Поиск | Проверить поиск по товарам |
| Вход | Войти через email и через Яндекс |

---

## Часть 10. Yandex OAuth (если используете)

Redirect URI в приложении Яндекс OAuth должен указывать на новый домен. Если домен тот же (territory-interior.ru) — менять не нужно.

Для кириллического домена убедитесь, что добавлен:
```
https://xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai/auth/yandex/callback
```

---

## Устранение проблем

### 502 Bad Gateway
- Backend ещё не готов: `docker compose logs backend`
- Увеличьте `start_period` в healthcheck при медленном запуске

### CORS-ошибки
- Проверьте `CORS_ORIGIN` в `.env` — оба домена через запятую

### Поиск не находит товары
- Выполните реиндексацию Elasticsearch (см. п. 5.5)

### Не отображаются изображения
- Проверьте восстановление uploads (п. 5.3)
- Убедитесь, что `API_BASE_URL` в `.env` корректен

---

## Алиас для удобства

Добавьте в `~/.bashrc`:

```bash
alias dc='docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml'
```

Тогда: `dc pull`, `dc up -d`, `dc logs backend` и т.д.

---

## Резюме этапов

1. **Старый сервер:** backup → скачать .sql и .tar.gz, .env
2. **Новый сервер:** настройка ОС, swap, firewall
3. **Новый сервер:** clone repo, .env, первый запуск
4. **Новый сервер:** restore PostgreSQL и uploads
5. **Новый сервер:** SSL, реиндексация ES, cron
6. **Проверка:** сайт, админка, товары, поиск, вход
