const listMoneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const listPercentFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export function formatContractsListMoney(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return listMoneyFormatter.format(n);
}

export function formatContractsListPaidWithPercent(
  paidRub: number,
  baseTotalRub: number | null
): string {
  const money = formatContractsListMoney(paidRub);
  if (
    baseTotalRub == null ||
    Number.isNaN(baseTotalRub) ||
    !Number.isFinite(baseTotalRub) ||
    baseTotalRub <= 0
  ) {
    return money;
  }
  const pct = (paidRub / baseTotalRub) * 100;
  const pctStr = listPercentFormatter.format(pct);
  return `${money} (${pctStr}%)`;
}

export function ellipsizeContractsListOneLine(s: string, maxLen: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

export function contractsListFilterFieldClass(
  base: string,
  active: boolean,
  activeClass: string
): string {
  return active ? `${base} ${activeClass}` : base;
}
