#!/bin/bash
# Добавление домена 601270.ru к существующему SSL-сертификату
# Использовать, если cert уже был получен до добавления нового домена
# Запускать на сервере в ~/platform-tir

set -e

DOMAIN_MAIN="territory-interior.ru"
DOMAIN2="xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai"  # территория-интерьерных-решений.рф
DOMAIN3="601270.ru"

echo "=== 1. Останавливаем nginx (освобождаем порт 80) ==="
cd "$(dirname "$0")/.."
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml stop nginx 2>/dev/null || true

echo ""
echo "=== 2. Расширение сертификата новым доменом ==="
sudo certbot certonly --standalone --expand -d "$DOMAIN_MAIN" -d "$DOMAIN2" -d "$DOMAIN3" --non-interactive

echo ""
echo "=== 3. Копирование сертификатов ==="
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/"$DOMAIN_MAIN"/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/"$DOMAIN_MAIN"/privkey.pem nginx/ssl/
sudo chown "$(whoami):$(whoami)" nginx/ssl/*.pem

echo ""
echo "=== 4. Запуск nginx ==="
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d nginx

echo ""
echo "✅ Сертификат расширен. Домены: $DOMAIN_MAIN, территория-интерьерных-решений.рф, $DOMAIN3"
