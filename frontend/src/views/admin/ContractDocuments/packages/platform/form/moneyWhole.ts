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
