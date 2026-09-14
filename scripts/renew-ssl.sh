#!/bin/bash
# Обновление SSL и перезапуск nginx. Для cron: 0 3 * * * /home/ruslan/platform-tir/scripts/renew-ssl.sh
#
# Работает без sudo: certbot запускается как Docker-контейнер (членство в группе docker
# даёт нужный доступ к /etc/letsencrypt), поэтому existing cron от пользователя ruslan актуален.
set -e
cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin"

DOMAIN="territory-interior.ru"
COMPOSE="docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml"
CERTBOT_IMAGE="certbot/certbot:latest"
UID_GID="$(id -u):$(id -g)"

CERTBOT="docker run --rm --network host -v /etc/letsencrypt:/etc/letsencrypt $CERTBOT_IMAGE"

start_nginx() {
  $COMPOSE up -d nginx
}

# Всегда поднимаем nginx обратно, даже если certbot упадёт
trap start_nginx EXIT

echo "=== Образ certbot ==="
docker image inspect "$CERTBOT_IMAGE" >/dev/null 2>&1 || docker pull "$CERTBOT_IMAGE"

echo "=== Останавливаем Docker nginx (освобождаем порт 80 для certbot standalone) ==="
$COMPOSE stop nginx 2>/dev/null || true

echo "=== Обновление сертификата ==="
$CERTBOT renew --quiet

echo "=== Копирование сертификатов в проект (владелец — $(id -un)) ==="
mkdir -p nginx/ssl
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  -v "$PWD/nginx/ssl:/dst" \
  "$CERTBOT_IMAGE" sh -c \
  "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /dst/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /dst/ && chown $UID_GID /dst/fullchain.pem /dst/privkey.pem"

echo "=== Запуск nginx ==="
$COMPOSE up -d nginx
trap - EXIT

echo "✅ Готово"
