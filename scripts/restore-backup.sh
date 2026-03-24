#!/bin/bash
# Восстановление из бэкапа после миграции
# Использование: ./scripts/restore-backup.sh POSTGRES_FILE [UPLOADS_FILE] [--clean]
#   --clean  перед восстановлением удалить БД и создать заново (для чистой миграции)
# Пример: ./scripts/restore-backup.sh backups/postgres_20250321_0200.sql backups/uploads_20250321_0200.tar.gz --clean

set -e
cd "$(dirname "$0")/.."

COMPOSE_FILES="-f docker-compose.infra.yml -f docker-compose.prod.yml"
if [ -f docker-compose.ssl.yml ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.ssl.yml"
fi

POSTGRES_FILE="${1:?Укажите путь к postgres_*.sql}"
UPLOADS_FILE=""
CLEAN_DB=false
for arg in "${@:2}"; do
  if [ "$arg" = "--clean" ]; then
    CLEAN_DB=true
  elif [ -f "$arg" ]; then
    UPLOADS_FILE="$arg"
  fi
done

if [ ! -f "$POSTGRES_FILE" ]; then
  echo "Ошибка: файл $POSTGRES_FILE не найден"
  exit 1
fi

echo "=== Останавливаем backend, frontend, nginx ==="
docker compose $COMPOSE_FILES stop backend frontend nginx 2>/dev/null || true

if [ "$CLEAN_DB" = true ]; then
  echo ""
  echo "=== Очистка БД (--clean) ==="
  docker compose $COMPOSE_FILES exec -T postgres psql -U platform_user -d postgres -c "DROP DATABASE IF EXISTS platform_tir;"
  docker compose $COMPOSE_FILES exec -T postgres psql -U platform_user -d postgres -c "CREATE DATABASE platform_tir;"
fi

echo ""
echo "=== Восстановление PostgreSQL ==="
docker compose $COMPOSE_FILES exec -T postgres psql -U platform_user -d platform_tir < "$POSTGRES_FILE"
echo "PostgreSQL восстановлен."

if [ -n "$UPLOADS_FILE" ] && [ -f "$UPLOADS_FILE" ]; then
  echo ""
  echo "=== Восстановление загрузок (uploads) ==="
  VOLUME_NAME=$(docker volume ls -q --filter name=backend_uploads | head -1)
  if [ -z "$VOLUME_NAME" ]; then
    VOLUME_NAME="platform-tir_backend_uploads"
  fi
  UPLOADS_DIR=$(dirname "$(realpath "$UPLOADS_FILE")")
  UPLOADS_BASENAME=$(basename "$UPLOADS_FILE")
  docker run --rm -v "${VOLUME_NAME}:/target" -v "${UPLOADS_DIR}:/backup:ro" alpine \
    sh -c "cd /target && tar -xzf /backup/${UPLOADS_BASENAME} --strip-components=1"
  echo "Загрузки восстановлены."
else
  echo ""
  echo "Файл uploads не указан или не найден. Пропуск."
fi

echo ""
echo "=== Запуск приложения ==="
docker compose $COMPOSE_FILES up -d

echo ""
echo "✅ Восстановление завершено."
echo ""
echo "Важно: выполните реиндексацию Elasticsearch для работы поиска:"
echo "  curl -X POST -H 'Authorization: Bearer YOUR_JWT' https://territory-interior.ru/api/v1/admin/catalog/products/reindex-elasticsearch"
echo "  Или войдите в админку под суперадмином и вызовите API вручную."
