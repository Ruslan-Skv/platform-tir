/** Опции пагинации журнала ДП — как в списке договоров. */
export const DP_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type DpPageLimit = (typeof DP_PAGE_LIMIT_OPTIONS)[number];

/** Записей на странице по умолчанию. */
export const DP_DEFAULT_PAGE_LIMIT: DpPageLimit = 50;

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

/** Направление «Мебель»: ручные записи этого направления несут исполнителя (справочник реквизитов). */
export const DP_FURNITURE_DIRECTION = 'Мебель';

/** Движения ДС вне продаж и договоров (хоз. товары и прочее) — не входят в итоговые продажи. */
export const DP_OTHER_DIRECTION = 'Прочее';

/** Основание ручной записи «Зар/плата»: выплата зар/платы из кассы с указанием получателя. */
export const DP_SALARY_PAYOUT_BASIS = 'Зар/плата';

/** Значение селекта основания «ввести вручную» — не сохраняется. */
export const DP_BASIS_CUSTOM_VALUE = '__custom__';

/** Пресеты основания ручной записи: выбор вместо набора текста. */
export const DP_MANUAL_BASIS_PRESET_OPTIONS: { value: string; label: string }[] = [
  { value: DP_SALARY_PAYOUT_BASIS, label: DP_SALARY_PAYOUT_BASIS },
  { value: 'Бытовые нужды', label: 'Бытовые нужды' },
  { value: 'Возврат излишка', label: 'Возврат излишка' },
];

/** Способы оплаты записи «Зар/плата»: наличные из кассы и безнал (перевод). */
export const DP_SALARY_PAYMENT_FORM_OPTIONS: { value: string; label: string }[] = [
  { value: 'CASH', label: 'Наличные' },
  { value: 'LC_TRANSFER', label: 'Переводы на ЛК' },
  { value: 'BANK_APP', label: 'Банк. прилож' },
];

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
  BANK_APP: 'Банк. прилож',
};

export const DP_PAYMENT_FORM_OPTIONS: { value: string; label: string }[] = [
  { value: 'CASH', label: 'Наличные' },
  { value: 'TERMINAL', label: 'Терминал' },
  { value: 'QR', label: 'QR-код' },
  { value: 'INVOICE', label: 'По счёту' },
  { value: 'LC_TRANSFER', label: 'Переводы на ЛК' },
  { value: 'BANK_APP', label: 'Банк. прилож' },
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
