#!/bin/bash
# Обновление SSL и перезапуск nginx. Для cron: 0 3 * * * /home/ruslan/platform-tir/scripts/renew-ssl.sh
set -e
cd "$(dirname "$0")/.."
DOMAIN="territory-interior.ru"

certbot renew --quiet
sudo cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem nginx/ssl/
sudo chown "$(whoami):$(whoami)" nginx/ssl/*.pem
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml restart nginx
