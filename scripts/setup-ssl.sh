#!/bin/bash
# Получение SSL-сертификатов Let's Encrypt для territory-interior.ru
# Запускать на сервере в ~/platform-tir
set -e

DOMAIN_MAIN="territory-interior.ru"
DOMAIN2="xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai"  # территория-интерьерных-решений.рф
DOMAIN3="601270.ru"

echo "=== 1. Останавливаем nginx (освобождаем порт 80) ==="
cd "$(dirname "$0")/.."
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml stop nginx 2>/dev/null || true

echo ""
echo "=== 2. Установка certbot (если не установлен) ==="
if ! command -v certbot &>/dev/null; then
    sudo apt-get update
    sudo apt-get install -y certbot
fi

echo ""
echo "=== 3. Получение сертификатов ==="
sudo certbot certonly --standalone -d "$DOMAIN_MAIN" -d "$DOMAIN2" -d "$DOMAIN3" --non-interactive --agree-tos --email admin@"$DOMAIN_MAIN"

echo ""
echo "=== 4. Копирование сертификатов в проект ==="
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/"$DOMAIN_MAIN"/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/"$DOMAIN_MAIN"/privkey.pem nginx/ssl/
sudo chown "$(whoami):$(whoami)" nginx/ssl/*.pem

echo ""
echo "=== 5. Запуск nginx с SSL ==="
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d nginx

echo ""
echo "✅ SSL настроен. Сайт доступен по https://$DOMAIN_MAIN"
echo ""
echo "Для автоматического обновления сертификатов добавьте в crontab (crontab -e):"
echo "  0 3 * * * $PWD/scripts/renew-ssl.sh"
