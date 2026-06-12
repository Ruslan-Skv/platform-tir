export function formatMoneyRub(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Доля `partRub` от `grandTotalRub` (общая стоимость по сводке «Договор и Д/с»). */
export function formatPercentOfGrandTotal(
  partRub: number | null | undefined,
  grandTotalRub: number | null | undefined,
  fractionDigits = 1
): string | null {
  if (partRub == null || !Number.isFinite(partRub)) return null;
  if (grandTotalRub == null || !Number.isFinite(grandTotalRub) || grandTotalRub <= 0) return null;
  const pct = (partRub / grandTotalRub) * 100;
  return `${pct.toFixed(fractionDigits).replace('.', ',')} %`;
}

export function formatDateRu(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate;
  return d.toLocaleDateString('ru-RU');
}

export function formatHubDiscountCell(discountPct: number) {
  return discountPct > 0 ? `${String(discountPct).replace('.', ',')} %` : '—';
}
