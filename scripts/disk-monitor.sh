#!/bin/bash
# Мониторинг заполнения диска с оповещениями на email
# Запуск: ./scripts/disk-monitor.sh
# Для cron (каждые 6 часов): 0 */6 * * * /path/to/platform-tir/scripts/disk-monitor.sh
#
# Переменные в .env (те же SMTP, что для писем приложения):
#   MAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
#   DISK_ALERT_EMAIL — адрес для получения алертов
# Без SMTP/DISK_ALERT_EMAIL — только логирование в файл.

set -e
cd "$(dirname "$0")/.."

# Пороги (процент заполнения)
WARN_PERCENT=80   # предупреждение
CRIT_PERCENT=90   # критично
CLEANUP_PERCENT=95  # при 95% можно автоматически запустить очистку (опционально)

# Загрузка .env
if [ -f .env ]; then
  MAIL_FROM=$(grep '^MAIL_FROM=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
  SMTP_HOST=$(grep '^SMTP_HOST=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
  SMTP_PORT=$(grep '^SMTP_PORT=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
  SMTP_USER=$(grep '^SMTP_USER=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
  SMTP_PASS=$(grep '^SMTP_PASS=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
  DISK_ALERT_EMAIL=$(grep '^DISK_ALERT_EMAIL=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -1)
fi
SMTP_PORT=${SMTP_PORT:-587}
MAIL_FROM=${MAIL_FROM:-noreply@localhost}

LOG_DIR="${LOG_DIR:-backups}"
mkdir -p "$LOG_DIR"
STATE_FILE="$LOG_DIR/disk-monitor.state"
LOG_FILE="$LOG_DIR/disk-monitor.log"

# Текущее использование диска (корень /)
USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
USED_GB=$(df -BG / | awk 'NR==2 {print $3}' | tr -d 'G')
TOTAL_GB=$(df -BG / | awk 'NR==2 {print $2}' | tr -d 'G')
AVAIL_GB=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
HOSTNAME=$(hostname 2>/dev/null || echo "server")

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

send_email() {
  local subject="$1"
  local body="$2"
  if [ -z "$DISK_ALERT_EMAIL" ] || [ -z "$SMTP_HOST" ]; then
    return
  fi
  python3 - "$DISK_ALERT_EMAIL" "$MAIL_FROM" "$SMTP_HOST" "$SMTP_PORT" "$SMTP_USER" "$SMTP_PASS" "$subject" "$body" << 'PYTHON'
import sys, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
try:
  to_addr, from_addr, host, port, user, passwd, subj, body = sys.argv[1:9]
  port = int(port)
  msg = MIMEMultipart()
  msg['From'] = from_addr
  msg['To'] = to_addr
  msg['Subject'] = subj
  msg.attach(MIMEText(body, 'plain', 'utf-8'))
  with smtplib.SMTP(host, port) as s:
    if port == 587:
      s.starttls()
    if user and passwd:
      s.login(user, passwd)
    s.send_message(msg)
except Exception as e:
  sys.exit(1)
PYTHON
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
  SUBJECT="[${HOSTNAME}] Критично: диск заполнен на ${USAGE}%"
  BODY="Критично! Диск заполнен на ${USAGE}% (осталось ${AVAIL_GB} GB из ${TOTAL_GB} GB). Срочно освободите место. Запустите: ./scripts/cleanup-disk.sh"
  log "CRITICAL: $BODY"
  if should_alert "crit"; then
    send_email "$SUBJECT" "$BODY" 2>/dev/null || log "Не удалось отправить email"
    save_state "crit"
  fi
  # Опционально: запустить очистку
  if [ "$USAGE" -ge "$CLEANUP_PERCENT" ] && [ -x "$(dirname "$0")/cleanup-disk.sh" ]; then
    log "Запуск автоматической очистки (95%+)..."
    "$(dirname "$0")/cleanup-disk.sh" >> "$LOG_FILE" 2>&1 || true
  fi
elif [ "$USAGE" -ge "$WARN_PERCENT" ]; then
  SUBJECT="[${HOSTNAME}] Внимание: диск заполнен на ${USAGE}%"
  BODY="Внимание — диск заполнен на ${USAGE}% (осталось ${AVAIL_GB} GB из ${TOTAL_GB} GB). Рекомендуется очистка: ./scripts/cleanup-disk.sh"
  log "WARNING: $BODY"
  if should_alert "warn"; then
    send_email "$SUBJECT" "$BODY" 2>/dev/null || log "Не удалось отправить email"
    save_state "warn"
  fi
else
  log "OK: диск ${USAGE}%, свободно ${AVAIL_GB} GB"
  # Сбросить state при нормальном уровне (чтобы при следующем росте снова уведомить)
  rm -f "$STATE_FILE" 2>/dev/null || true
fi
