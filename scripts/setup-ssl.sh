#!/bin/bash
# Получение SSL-сертификатов Let's Encrypt (основной домен 601270.ru + зеркала и квиз-домены)
# Запускать на сервере в ~/platform-tir
set -e

DOMAIN_MAIN="601270.ru"
DOMAIN2="territory-interior.ru"
DOMAIN3="xn-----mlcbabasabfm9bcdf6aacfbc3aeg7f4dwdza7f.xn--p1ai"  # территория-интерьерных-решений.рф
DOMAIN4="mebel-na-zakaz-51.ru"
DOMAIN5="remont-kvartir-51.ru"
DOMAIN6="psk-pobeda.ru"
DOMAIN7="www.psk-pobeda.ru"

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
sudo certbot certonly --standalone -d "$DOMAIN_MAIN" -d "$DOMAIN2" -d "$DOMAIN3" -d "$DOMAIN4" -d "$DOMAIN5" -d "$DOMAIN6" -d "$DOMAIN7" --non-interactive --agree-tos --email admin@"$DOMAIN_MAIN"

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
