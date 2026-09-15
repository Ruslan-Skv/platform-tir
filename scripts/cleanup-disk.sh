#!/bin/bash
# Очистка диска от ненужных файлов (Docker, apt, логи)
# Запуск: ./scripts/cleanup-disk.sh
# Для cron (еженедельно воскресенье 3:00): 0 3 * * 0 /path/to/platform-tir/scripts/cleanup-disk.sh >> /path/to/platform-tir/backups/cleanup.log 2>&1
#
# НЕ удаляет: данные БД, загрузки (uploads), бэкапы — только временные и кэш.

set -e
cd "$(dirname "$0")/.."

LOG_DIR="${LOG_DIR:-backups}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/cleanup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Начало очистки диска ==="

# 1. Docker: неиспользуемые образы, контейнеры, build cache (НЕ трогаем volumes с БД!)
log "Docker: удаление неиспользуемых данных..."
BEFORE_DOCKER=$(df -h / | awk 'NR==2 {print $3}')
# prune: остановленные контейнеры, dangling образы, неиспользуемые сети. БЕЗ --volumes — данные БД сохраняются
docker system prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
log "  Docker очистка выполнена"

# 2. APT кэш (sudo: при cron добавьте NOPASSWD в sudoers или запускайте от root)
if command -v apt-get &>/dev/null; then
  log "APT: очистка кэша..."
  sudo apt-get clean 2>/dev/null || true
  sudo apt-get autoremove -y 2>/dev/null || true
  log "  APT очистка выполнена"
fi

# 3. Журнал systemd (оставить последние 100 MB)
if command -v journalctl &>/dev/null; then
  log "Journal: ограничение размера логов..."
  sudo journalctl --vacuum-size=100M 2>/dev/null || true
  log "  Journal очищен"
fi

# 4. Временные файлы (старше 7 дней)
if [ -d /tmp ]; then
  log "Tmp: удаление старых файлов..."
  find /tmp -type f -atime +7 -delete 2>/dev/null || true
  log "  Tmp очищен"
fi

# 5. Логи в проекте (если есть)
if [ -d "backups" ]; then
  # Ограничить размер cleanup.log (последние 1000 строк)
  if [ -f "$LOG_FILE" ] && [ $(wc -l < "$LOG_FILE") -gt 1000 ]; then
    tail -500 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
  fi
fi

AFTER=$(df -h / | awk 'NR==2 {print $3}')
log "=== Очистка завершена. Диск до: $BEFORE_DOCKER, после: $AFTER ==="
