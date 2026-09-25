export const MONEY_MOVEMENTS_PAGE_SIZE = 50;

/** Направления раздела ДП — как в реестре направлений пакетов договоров. */
export const DP_DIRECTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'Ремонт', label: 'Ремонт' },
  { value: 'Окна', label: 'Окна' },
  { value: 'Двери', label: 'Двери' },
  { value: 'Потолки', label: 'Потолки' },
  { value: 'Жалюзи', label: 'Жалюзи' },
  { value: 'Мебель', label: 'Мебель' },
];

/** Спец. направления ручных записей ДП — вне реестра направлений договоров. */
export const DP_MATERIALS_DIRECTION = 'Материалы';

/** Движения ДС вне продаж и договоров (хоз. товары и прочее) — не входят в итоговые продажи. */
export const DP_OTHER_DIRECTION = 'Прочее';

/** Направления ручной записи: направления договоров + «Материалы» + «Прочее». */
export const DP_MANUAL_DIRECTION_OPTIONS: { value: string; label: string }[] = [
  ...DP_DIRECTION_OPTIONS,
  { value: DP_MATERIALS_DIRECTION, label: DP_MATERIALS_DIRECTION },
  { value: DP_OTHER_DIRECTION, label: DP_OTHER_DIRECTION },
];

/** Направления продаж для плиток итогов: направления + «Материалы», без «Прочее». */
export const DP_SALES_DIRECTION_OPTIONS: { value: string; label: string }[] =
  DP_MANUAL_DIRECTION_OPTIONS.filter((option) => option.value !== DP_OTHER_DIRECTION);

export const DP_PAYMENT_FORM_LABELS: Record<string, string> = {
  CASH: 'Наличные',
  TERMINAL: 'Терминал',
  QR: 'QR-код',
  INVOICE: 'По счёту',
  LC_TRANSFER: 'Переводы на ЛК',
};

export const DP_PAYMENT_FORM_OPTIONS: { value: string; label: string }[] = [
  { value: 'CASH', label: 'Наличные' },
  { value: 'TERMINAL', label: 'Терминал' },
  { value: 'QR', label: 'QR-код' },
  { value: 'INVOICE', label: 'По счёту' },
  { value: 'LC_TRANSFER', label: 'Переводы на ЛК' },
];

export const DP_PAYMENT_TYPE_LABELS: Record<string, string> = {
  PREPAYMENT: 'Предоплата',
  ADVANCE: 'Частичная оплата',
  FINAL: 'Окончательный расчёт',
  AMENDMENT: 'Оплата доп. соглашения',
  REFUND: 'Возврат',
  OTHER: 'Ручная запись',
};

export function formatDpDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

export function formatDpTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatDpMoney(value: string | number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function monthBoundsIso(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: toLocalIsoDate(from), to: toLocalIsoDate(to) };
}

export function todayIsoDate() {
  return toLocalIsoDate(new Date());
}

/** Локальная дата в ISO (YYYY-MM-DD) без сдвига таймзоны, как у toISOString(). */
export function toLocalIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
