import type { Contract } from '@/shared/api/admin-crm';

export function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

export function formatMoney(v: string | number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(v));
}

function isDateInPeriod(
  dateStr: string | null | undefined,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateStr || !dateFrom || !dateTo) return false;
  const d = dateStr.slice(0, 10);
  return d >= dateFrom && d <= dateTo;
}

export function contractToRow(
  c: Contract,
  options: { dateFrom: string; dateTo: string; prepaymentPct: string }
): Record<string, string> {
  const amendments = (c.amendments ?? [])
    .slice(0, 5)
    .sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  const dsByIndex = [amendments[0], amendments[1], amendments[2], amendments[3], amendments[4]];

  const payments = (c.payments ?? [])
    .slice()
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
    .slice(0, 7);

  const contractDateInPeriod = isDateInPeriod(c.contractDate, options.dateFrom, options.dateTo);
  const deliveryDateInPeriod = isDateInPeriod(c.actWorkEndDate, options.dateFrom, options.dateTo);
  const pct = parseFloat(options.prepaymentPct.replace(',', '.')) || 0;
  const amount = Number(c.totalAmount) || 0;

  let salaryContractValue = 0;
  if (amount <= 0) {
    // не считаем
  } else if (contractDateInPeriod && deliveryDateInPeriod) {
    salaryContractValue = amount * (1 / 100);
  } else if (contractDateInPeriod) {
    salaryContractValue = amount * (pct / 100) * (1 / 100);
  } else if (deliveryDateInPeriod) {
    salaryContractValue = amount * ((100 - pct) / 100) * (1 / 100);
  }

  return {
    contractNumber: c.contractNumber ?? '—',
    contractDate: formatDate(c.contractDate),
    deliveryDate: formatDate(c.actWorkEndDate),
    contractAmount: formatMoney(c.totalAmount),
    ds1: dsByIndex[0] ? `${formatMoney(dsByIndex[0].amount)}` : '—',
    ds2: dsByIndex[1] ? `${formatMoney(dsByIndex[1].amount)}` : '—',
    ds3: dsByIndex[2] ? `${formatMoney(dsByIndex[2].amount)}` : '—',
    ds4: dsByIndex[3] ? `${formatMoney(dsByIndex[3].amount)}` : '—',
    ds5: dsByIndex[4] ? `${formatMoney(dsByIndex[4].amount)}` : '—',
    payment1: payments[0] ? formatMoney(payments[0].amount) : '—',
    payment2: payments[1] ? formatMoney(payments[1].amount) : '—',
    payment3: payments[2] ? formatMoney(payments[2].amount) : '—',
    payment4: payments[3] ? formatMoney(payments[3].amount) : '—',
    payment5: payments[4] ? formatMoney(payments[4].amount) : '—',
    payment6: payments[5] ? formatMoney(payments[5].amount) : '—',
    payment7: payments[6] ? formatMoney(payments[6].amount) : '—',
    salaryContract: salaryContractValue > 0 ? formatMoney(salaryContractValue) : '—',
    salaryDs: '—',
  };
}

export function getDefaultPeriod() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}
