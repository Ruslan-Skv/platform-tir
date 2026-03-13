#!/bin/bash
# Автоматическое резервное копирование PostgreSQL и загрузок
# Запуск: ./scripts/backup.sh
# Для cron: 0 2 * * * /home/ruslan/platform-tir/scripts/backup.sh

set -e
cd "$(dirname "$0")/.."

COMPOSE_FILES="-f docker-compose.infra.yml -f docker-compose.prod.yml"
if [ -f docker-compose.ssl.yml ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.ssl.yml"
fi

# POSTGRES_USER и POSTGRES_DB из .env
if [ -f .env ]; then
  POSTGRES_USER=$(grep '^POSTGRES_USER=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
  POSTGRES_DB=$(grep '^POSTGRES_DB=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
fi
POSTGRES_USER=${POSTGRES_USER:-platform_user}
POSTGRES_DB=${POSTGRES_DB:-platform_tir}

BACKUP_DIR="backups"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Начало резервного копирования..."

# PostgreSQL
echo "  → PostgreSQL..."
docker compose $COMPOSE_FILES exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/postgres_${DATE}.sql"

# Загрузки (uploads)
echo "  → Загрузки..."
docker compose $COMPOSE_FILES exec -T backend tar -czf - -C /app uploads > "$BACKUP_DIR/uploads_${DATE}.tar.gz"

echo "[$(date)] Резервное копирование завершено."
echo "  PostgreSQL: $BACKUP_DIR/postgres_${DATE}.sql"
echo "  Загрузки:  $BACKUP_DIR/uploads_${DATE}.tar.gz"

# Удаление старых бэкапов (старше RETENTION_DAYS дней)
echo "  Удаление бэкапов старше $RETENTION_DAYS дней..."
find "$BACKUP_DIR" -name 'postgres_*.sql' -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name 'uploads_*.tar.gz' -mtime +$RETENTION_DAYS -delete
