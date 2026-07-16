#!/bin/bash
# Селективное восстановление атрибутов из SQL-бэкапа (без отката всей БД).
#
# Восстанавливает только отсутствующие строки в:
#   attributes, attribute_values, category_attributes, catalog_filter_block_items
# Таблица products НЕ затрагивается — значения в products.attributes обычно уже на месте.
#
# Использование:
#   ./scripts/restore-attributes-from-backup.sh                    # предпросмотр (dry-run)
#   ./scripts/restore-attributes-from-backup.sh --apply              # выполнить восстановление
#   ./scripts/restore-attributes-from-backup.sh --apply --backup-file path/to/dump.sql
#   ./scripts/restore-attributes-from-backup.sh --apply --exclude-category-id cmnsqs1vb00d710ovhxehl3i2
#
# По умолчанию: backups/postgres_20260715_0200.sql

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILES="-f docker-compose.infra.yml -f docker-compose.prod.yml"
if [ -f docker-compose.ssl.yml ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.ssl.yml"
fi

BACKUP_FILE="backups/postgres_20260715_0200.sql"
TEMP_DB="platform_tir_restore_attrs"
APPLY=false
SKIP_PRE_BACKUP=false
KEEP_TEMP=false
EXCLUDE_CATEGORY_ID=""

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --apply)
      APPLY=true
      ;;
    --dry-run)
      APPLY=false
      ;;
    --backup-file)
      shift
      BACKUP_FILE="${1:?Укажите путь к postgres_*.sql после --backup-file}"
      ;;
    --exclude-category-id)
      shift
      EXCLUDE_CATEGORY_ID="${1:?Укажите categoryId после --exclude-category-id}"
      ;;
    --skip-pre-backup)
      SKIP_PRE_BACKUP=true
      ;;
    --keep-temp)
      KEEP_TEMP=true
      ;;
    -h|--help)
      usage 0
      ;;
    *)
      echo "Неизвестный аргумент: $1"
      usage 1
      ;;
  esac
  shift
done

if [ -f .env ]; then
  PG_USER=$(grep '^POSTGRES_USER=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
  PG_DB=$(grep '^POSTGRES_DB=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
fi
PG_USER=${PG_USER:-platform_user}
PG_DB=${PG_DB:-platform_tir}

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Ошибка: файл бэкапа не найден: $BACKUP_FILE"
  exit 1
fi

dc_psql() {
  local db="$1"
  shift
  docker compose $COMPOSE_FILES exec -T postgres psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$db" "$@"
}

cleanup_temp_db() {
  if [ "$KEEP_TEMP" = true ]; then
    echo "Временная БД сохранена: $TEMP_DB (флаг --keep-temp)"
    return
  fi
  echo "Удаление временной БД $TEMP_DB..."
  dc_psql postgres -c "DROP DATABASE IF EXISTS \"$TEMP_DB\";" >/dev/null
}

trap cleanup_temp_db EXIT

echo "=== Восстановление атрибутов из бэкапа ==="
echo "  Бэкап:      $BACKUP_FILE"
echo "  Прод БД:    $PG_DB"
echo "  Временная:  $TEMP_DB"
echo "  Режим:      $([ "$APPLY" = true ] && echo 'ПРИМЕНЕНИЕ' || echo 'предпросмотр (dry-run)')"
if [ -n "$EXCLUDE_CATEGORY_ID" ]; then
  echo "  Исключить category_attributes для categoryId: $EXCLUDE_CATEGORY_ID"
fi
echo ""

if [ "$APPLY" = true ]; then
  read -r -p "Продолжить восстановление? Введите yes: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Отменено."
    exit 0
  fi
fi

if [ "$SKIP_PRE_BACKUP" = false ] && [ "$APPLY" = true ]; then
  echo "=== Создание свежего бэкапа перед изменениями ==="
  ./scripts/backup.sh
  echo ""
fi

echo "=== Подготовка временной БД ==="
dc_psql postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TEMP_DB' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
dc_psql postgres -c "DROP DATABASE IF EXISTS \"$TEMP_DB\";"
dc_psql postgres -c "CREATE DATABASE \"$TEMP_DB\" OWNER \"$PG_USER\";"

echo "Загрузка бэкапа во временную БД (может занять несколько минут)..."
dc_psql "$TEMP_DB" < "$BACKUP_FILE" >/dev/null
echo "Бэкап загружен во временную БД."
echo ""

echo "=== Подключение dblink ==="
dc_psql "$PG_DB" -c "CREATE EXTENSION IF NOT EXISTS dblink;"

DBLINK_CONN="dbname=$TEMP_DB user=$PG_USER"

EXCLUDE_CA_SQL=""
if [ -n "$EXCLUDE_CATEGORY_ID" ]; then
  EXCLUDE_CA_SQL="AND src.\"categoryId\" <> '$EXCLUDE_CATEGORY_ID'"
fi

run_sql() {
  dc_psql "$PG_DB" "$@"
}

count_missing() {
  local label="$1"
  local sql="$2"
  local count
  count=$(run_sql -t -A -c "$sql" | tr -d '[:space:]')
  echo "  $label: $count"
}

echo "=== Что отсутствует в проде (есть в бэкапе) ==="

count_missing "attributes" "
SELECT COUNT(*)::text
FROM dblink(
  '$DBLINK_CONN',
  'SELECT id FROM attributes'
) AS src(id text)
WHERE NOT EXISTS (
  SELECT 1 FROM attributes p WHERE p.id = src.id
);
"

count_missing "attribute_values" "
SELECT COUNT(*)::text
FROM dblink(
  '$DBLINK_CONN',
  'SELECT v.id FROM attribute_values v INNER JOIN attributes a ON a.id = v.\"attributeId\"'
) AS src(id text)
WHERE NOT EXISTS (SELECT 1 FROM attribute_values p WHERE p.id = src.id);
"

count_missing "category_attributes" "
SELECT COUNT(*)::text
FROM dblink(
  '$DBLINK_CONN',
  'SELECT ca.id, ca.\"categoryId\", ca.\"attributeId\" FROM category_attributes ca INNER JOIN attributes a ON a.id = ca.\"attributeId\"'
) AS src(id text, \"categoryId\" text, \"attributeId\" text)
WHERE EXISTS (SELECT 1 FROM categories c WHERE c.id = src.\"categoryId\")
  $EXCLUDE_CA_SQL
  AND NOT EXISTS (SELECT 1 FROM category_attributes p WHERE p.id = src.id);
"

count_missing "catalog_filter_block_items" "
SELECT COUNT(*)::text
FROM dblink(
  '$DBLINK_CONN',
  'SELECT i.id, i.\"blockId\", i.\"attributeId\" FROM catalog_filter_block_items i INNER JOIN attributes a ON a.id = i.\"attributeId\"'
) AS src(id text, \"blockId\" text, \"attributeId\" text)
WHERE EXISTS (SELECT 1 FROM catalog_filter_blocks b WHERE b.id = src.\"blockId\")
  AND NOT EXISTS (SELECT 1 FROM catalog_filter_block_items p WHERE p.id = src.id);
"

echo ""

if [ "$APPLY" != true ]; then
  echo "Это предпросмотр. Для восстановления запустите:"
  echo "  ./scripts/restore-attributes-from-backup.sh --apply"
  exit 0
fi

echo "=== Вставка отсутствующих данных ==="

run_sql -c "
BEGIN;

INSERT INTO attributes (
  id, name, slug, type, unit, \"isFilterable\", \"isRequired\", \"order\", \"createdAt\", \"updatedAt\"
)
SELECT
  src.id, src.name, src.slug, src.type::\"AttributeType\", src.unit,
  src.\"isFilterable\", src.\"isRequired\", src.\"order\", src.\"createdAt\", src.\"updatedAt\"
FROM dblink(
  '$DBLINK_CONN',
  'SELECT id, name, slug, type, unit, \"isFilterable\", \"isRequired\", \"order\", \"createdAt\", \"updatedAt\" FROM attributes'
) AS src(
  id text, name text, slug text, type text, unit text,
  \"isFilterable\" boolean, \"isRequired\" boolean, \"order\" integer,
  \"createdAt\" timestamptz, \"updatedAt\" timestamptz
)
WHERE NOT EXISTS (SELECT 1 FROM attributes p WHERE p.id = src.id);

INSERT INTO attribute_values (
  id, \"attributeId\", value, \"colorHex\", \"order\", \"createdAt\"
)
SELECT
  src.id, src.\"attributeId\", src.value, src.\"colorHex\", src.\"order\", src.\"createdAt\"
FROM dblink(
  '$DBLINK_CONN',
  'SELECT id, \"attributeId\", value, \"colorHex\", \"order\", \"createdAt\" FROM attribute_values'
) AS src(
  id text, \"attributeId\" text, value text, \"colorHex\" text,
  \"order\" integer, \"createdAt\" timestamptz
)
WHERE EXISTS (SELECT 1 FROM attributes a WHERE a.id = src.\"attributeId\")
  AND NOT EXISTS (SELECT 1 FROM attribute_values p WHERE p.id = src.id);

INSERT INTO category_attributes (
  id, \"categoryId\", \"attributeId\", \"isRequired\", \"order\", \"createdAt\"
)
SELECT
  src.id, src.\"categoryId\", src.\"attributeId\", src.\"isRequired\", src.\"order\", src.\"createdAt\"
FROM dblink(
  '$DBLINK_CONN',
  'SELECT id, \"categoryId\", \"attributeId\", \"isRequired\", \"order\", \"createdAt\" FROM category_attributes'
) AS src(
  id text, \"categoryId\" text, \"attributeId\" text,
  \"isRequired\" boolean, \"order\" integer, \"createdAt\" timestamptz
)
WHERE EXISTS (SELECT 1 FROM attributes a WHERE a.id = src.\"attributeId\")
  AND EXISTS (SELECT 1 FROM categories c WHERE c.id = src.\"categoryId\")
  $EXCLUDE_CA_SQL
  AND NOT EXISTS (SELECT 1 FROM category_attributes p WHERE p.id = src.id);

INSERT INTO catalog_filter_block_items (
  id, \"blockId\", kind, \"attributeId\", \"labelOverride\", \"sortOrder\", \"optionsSort\", \"manualOptionOrder\"
)
SELECT
  src.id, src.\"blockId\", src.kind::\"CatalogFilterItemKind\", src.\"attributeId\",
  src.\"labelOverride\", src.\"sortOrder\", src.\"optionsSort\"::\"CatalogFilterOptionsSort\", src.\"manualOptionOrder\"
FROM dblink(
  '$DBLINK_CONN',
  'SELECT id, \"blockId\", kind, \"attributeId\", \"labelOverride\", \"sortOrder\", \"optionsSort\", \"manualOptionOrder\" FROM catalog_filter_block_items WHERE \"attributeId\" IS NOT NULL'
) AS src(
  id text, \"blockId\" text, kind text, \"attributeId\" text, \"labelOverride\" text,
  \"sortOrder\" integer, \"optionsSort\" text, \"manualOptionOrder\" jsonb
)
WHERE EXISTS (SELECT 1 FROM attributes a WHERE a.id = src.\"attributeId\")
  AND EXISTS (SELECT 1 FROM catalog_filter_blocks b WHERE b.id = src.\"blockId\")
  AND NOT EXISTS (SELECT 1 FROM catalog_filter_block_items p WHERE p.id = src.id);

COMMIT;
"

echo ""
echo "=== Итог после восстановления ==="
count_missing "attributes (ещё отсутствуют)" "
SELECT COUNT(*)::text
FROM dblink('$DBLINK_CONN', 'SELECT id FROM attributes') AS src(id text)
WHERE NOT EXISTS (SELECT 1 FROM attributes p WHERE p.id = src.id);
"
count_missing "attribute_values (ещё отсутствуют)" "
SELECT COUNT(*)::text
FROM dblink('$DBLINK_CONN', 'SELECT id FROM attribute_values') AS src(id text)
WHERE NOT EXISTS (SELECT 1 FROM attribute_values p WHERE p.id = src.id);
"
count_missing "category_attributes (ещё отсутствуют)" "
SELECT COUNT(*)::text
FROM dblink('$DBLINK_CONN', 'SELECT id FROM category_attributes') AS src(id text)
WHERE NOT EXISTS (SELECT 1 FROM category_attributes p WHERE p.id = src.id);
"

echo ""
echo "✅ Восстановление завершено."
echo ""
echo "Проверьте в админке:"
echo "  1. Атрибуты соседних категорий «Межкомнатные двери»"
echo "  2. Карточки товаров — значения атрибутов"
echo "  3. В «Арки межкомнатные» снимите лишние атрибуты кнопкой «Убрать» (не 🗑️)"
echo ""
echo "При ошибке откат возможен из свежего бэкапа в backups/ (создан перед --apply)."
