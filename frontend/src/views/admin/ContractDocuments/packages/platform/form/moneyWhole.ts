/**
 * Округление стоимостей в документах пакета (сметы, счёт-заказы, спецификации,
 * д/с, итого договоров) до целых рублей — без копеек.
 */

export function roundMoneyToWholeRubles(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/** Целые рубли без разделителей групп: 12345,67 → «12346» (стиль полей смет и договоров). */
export function formatMoneyWholePlain(value: number): string {
  return String(roundMoneyToWholeRubles(value));
}

/** Целые рубли с разделителями групп: 12345,67 → «12 346» (стиль спецификаций). */
export function formatMoneyWholeGrouped(value: number): string {
  return roundMoneyToWholeRubles(value).toLocaleString('ru-RU');
}

/** Разряды числа через неразрывный пробел: «1453377» → «1 453 377». */
export function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

/**
 * Сумма с разделителями групп и «умными» копейками: целая — без копеек
 * (1453377 → «1 453 377»), дробная — с копейками (1453377.76 → «1 453 377,76»).
 */
export function formatMoneyRublesKopecksGrouped(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  const [intPart, frac] = rounded.toFixed(2).split('.');
  const intGrouped = groupThousands(intPart);
  return Number(frac) === 0 ? intGrouped : `${intGrouped},${frac}`;
}

/**
 * Округление суммы из строкового поля («12 345,67», «12345.67 руб.») до целых рублей.
 * Пустая строка — пустая строка; нечисловое значение возвращается как есть.
 */
export function roundMoneyStringToWhole(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return trimmed;
  const normalized = trimmed
    .replace(/\s+/g, '')
    .replace(/руб\.?/gi, '')
    .replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return trimmed;
  return formatMoneyWholePlain(Number(normalized));
}
