#!/bin/bash
# Расширение SSL-сертификата новыми доменами (все домены проекта в одном cert)
# Запускать на сервере в ~/platform-tir после настройки DNS
set -e

DOMAIN_MAIN="601270.ru"
DOMAIN2="territory-interior.ru"
DOMAIN3="xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai"  # территория-интерьерных-решений.рф
DOMAIN4="mebel-na-zakaz-51.ru"
DOMAIN5="remont-kvartir-51.ru"
DOMAIN6="psk-pobeda.ru"
DOMAIN7="www.psk-pobeda.ru"
# Каталог lineage certbot (имя от первого выпуска сертификата) — не зависит от основного домена
CERT_LINEAGE="territory-interior.ru"

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
  -d "$DOMAIN6" \
  -d "$DOMAIN7" \
  --non-interactive

echo ""
echo "=== 3. Копирование сертификатов ==="
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/"$CERT_LINEAGE"/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/"$CERT_LINEAGE"/privkey.pem nginx/ssl/
sudo chown "$(whoami):$(whoami)" nginx/ssl/*.pem

echo ""
echo "=== 4. Запуск nginx ==="
$COMPOSE up -d nginx

echo ""
echo "✅ Сертификат расширен. Домены:"
echo "   $DOMAIN_MAIN, $DOMAIN2, территория-интерьерных-решений.рф, $DOMAIN4, $DOMAIN5, $DOMAIN6, $DOMAIN7"
