#!/bin/bash
# Мониторинг заполнения диска с оповещениями в Telegram
# Запуск: ./scripts/disk-monitor.sh
# Для cron (каждые 6 часов): 0 */6 * * * /path/to/platform-tir/scripts/disk-monitor.sh
#
# Переменные в .env:
#   TELEGRAM_BOT_TOKEN   — токен бота (если есть)
#   TELEGRAM_ALERT_CHAT_ID — ID чата для алертов (узнать: написать боту @userinfobot)
# Без TELEGRAM_* — только логирование в файл.

set -e
cd "$(dirname "$0")/.."

# Пороги (процент заполнения)
WARN_PERCENT=80   # предупреждение
CRIT_PERCENT=90   # критично
CLEANUP_PERCENT=95  # при 95% можно автоматически запустить очистку (опционально)

# Загрузка .env (только TELEGRAM_*)
if [ -f .env ]; then
  TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
  TELEGRAM_ALERT_CHAT_ID=$(grep '^TELEGRAM_ALERT_CHAT_ID=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
fi

LOG_DIR="${LOG_DIR:-backups}"
mkdir -p "$LOG_DIR"
STATE_FILE="$LOG_DIR/disk-monitor.state"
LOG_FILE="$LOG_DIR/disk-monitor.log"

# Текущее использование диска (корень /)
USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
USED_GB=$(df -BG / | awk 'NR==2 {print $3}' | tr -d 'G')
TOTAL_GB=$(df -BG / | awk 'NR==2 {print $2}' | tr -d 'G')
AVAIL_GB=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

send_telegram() {
  local msg="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_ALERT_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_ALERT_CHAT_ID}" \
      -d "text=${msg}" \
      -d "parse_mode=HTML" \
      -d "disable_web_page_preview=1" >/dev/null 2>&1 || true
  fi
}

# Не спамить: если уже отправляли алерт для этого уровня за последние 24ч — пропустить
should_alert() {
  local level="$1"
  if [ ! -f "$STATE_FILE" ]; then return 0; fi
  local last=$(grep "^${level}:" "$STATE_FILE" 2>/dev/null | cut -d: -f2)
  if [ -z "$last" ]; then return 0; fi
  local now=$(date +%s)
  local diff=$((now - last))
  [ $diff -gt 86400 ]  # 24 часа
}

save_state() {
  local level="$1"
  echo "${level}:$(date +%s)" >> "$STATE_FILE"
  # Оставить только последние записи
  tail -5 "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null && mv "${STATE_FILE}.tmp" "$STATE_FILE"
}

# Основная логика
if [ "$USAGE" -ge "$CRIT_PERCENT" ]; then
  MSG="🚨 <b>Критично!</b> Диск заполнен на ${USAGE}% (осталось ${AVAIL_GB} GB из ${TOTAL_GB} GB). Срочно освободите место."
  log "CRITICAL: $MSG"
  if should_alert "crit"; then
    send_telegram "$MSG"
    save_state "crit"
  fi
  # Опционально: запустить очистку
  if [ "$USAGE" -ge "$CLEANUP_PERCENT" ] && [ -x "$(dirname "$0")/cleanup-disk.sh" ]; then
    log "Запуск автоматической очистки (95%+)..."
    "$(dirname "$0")/cleanup-disk.sh" >> "$LOG_FILE" 2>&1 || true
  fi
elif [ "$USAGE" -ge "$WARN_PERCENT" ]; then
  MSG="⚠️ <b>Внимание</b> — диск заполнен на ${USAGE}% (осталось ${AVAIL_GB} GB). Рекомендуется очистка."
  log "WARNING: $MSG"
  if should_alert "warn"; then
    send_telegram "$MSG"
    save_state "warn"
  fi
else
  log "OK: диск ${USAGE}%, свободно ${AVAIL_GB} GB"
  # Сбросить state при нормальном уровне (чтобы при следующем росте снова уведомить)
  rm -f "$STATE_FILE" 2>/dev/null || true
fi
