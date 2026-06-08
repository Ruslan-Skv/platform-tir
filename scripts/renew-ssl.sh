#!/bin/bash
# Обновление SSL и перезапуск nginx. Для cron: 0 3 * * * /home/ruslan/platform-tir/scripts/renew-ssl.sh
set -e
cd "$(dirname "$0")/.."
DOMAIN="territory-interior.ru"
COMPOSE="docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml"

start_nginx() {
  $COMPOSE up -d nginx
}

# Всегда поднимаем nginx обратно, даже если certbot упадёт
trap start_nginx EXIT

echo "=== Останавливаем Docker nginx (освобождаем порт 80 для certbot standalone) ==="
$COMPOSE stop nginx 2>/dev/null || true

echo "=== Обновление сертификата ==="
sudo certbot renew --quiet

echo "=== Копирование сертификатов в проект ==="
sudo cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem nginx/ssl/
sudo chown "$(whoami):$(whoami)" nginx/ssl/*.pem

echo "=== Запуск nginx ==="
$COMPOSE up -d nginx
trap - EXIT

echo "✅ Готово"
