#!/bin/bash
# Расширение SSL-сертификата новыми доменами (все домены проекта в одном cert)
# Запускать на сервере в ~/platform-tir после настройки DNS
set -e

DOMAIN_MAIN="territory-interior.ru"
DOMAIN2="xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai"  # территория-интерьерных-решений.рф
DOMAIN3="601270.ru"
DOMAIN4="mebel-na-zakaz-51.ru"
DOMAIN5="remont-kvartir-51.ru"

COMPOSE="docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml -f docker-compose.ssl.yml"

echo "=== 1. Останавливаем nginx (освобождаем порт 80) ==="
cd "$(dirname "$0")/.."
$COMPOSE stop nginx 2>/dev/null || true

echo ""
echo "=== 2. Расширение сертификата (--expand сохраняет существующие домены) ==="
sudo certbot certonly --standalone --expand \
  -d "$DOMAIN_MAIN" \
  -d "$DOMAIN2" \
  -d "$DOMAIN3" \
  -d "$DOMAIN4" \
  -d "$DOMAIN5" \
  --non-interactive

echo ""
echo "=== 3. Копирование сертификатов ==="
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/"$DOMAIN_MAIN"/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/"$DOMAIN_MAIN"/privkey.pem nginx/ssl/
sudo chown "$(whoami):$(whoami)" nginx/ssl/*.pem

echo ""
echo "=== 4. Запуск nginx ==="
$COMPOSE up -d nginx

echo ""
echo "✅ Сертификат расширен. Домены:"
echo "   $DOMAIN_MAIN, территория-интерьерных-решений.рф, $DOMAIN3, $DOMAIN4, $DOMAIN5"
