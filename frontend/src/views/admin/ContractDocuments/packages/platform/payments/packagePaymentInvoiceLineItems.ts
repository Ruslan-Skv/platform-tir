import { formatInvoiceMoneyAmount } from '../form/invoiceTemplateFields';

export type PaymentInvoiceLineKind = 'GOODS' | 'SERVICE';

export const PAYMENT_INVOICE_LINE_KIND_LABELS: Record<PaymentInvoiceLineKind, string> = {
  GOODS: 'Товар',
  SERVICE: 'Услуга',
};

export type PaymentInvoiceLineItem = {
  lineKind: PaymentInvoiceLineKind;
  name: string;
  quantity: string;
  unit: string;
  vatLabel: string;
  unitPrice: string;
  amount: string;
};

export type PaymentInvoiceLineDisplayGroup = {
  title: string;
  kind: PaymentInvoiceLineKind;
  entries: Array<{ line: PaymentInvoiceLineItem; index: number }>;
};

export function normalizePaymentInvoiceLineKind(raw: unknown): PaymentInvoiceLineKind {
  if (raw === 'GOODS' || raw === 'Товар') return 'GOODS';
  return 'SERVICE';
}

export function groupPaymentInvoiceLinesForDisplay(lines: PaymentInvoiceLineItem[]): {
  grouped: boolean;
  groups: PaymentInvoiceLineDisplayGroup[];
} {
  const entries = lines.map((line, index) => ({
    line: normalizePaymentInvoiceLineItem(line),
    index,
  }));
  const goods = entries.filter((e) => e.line.lineKind === 'GOODS');
  const services = entries.filter((e) => e.line.lineKind === 'SERVICE');
  if (goods.length > 0 && services.length > 0) {
    return {
      grouped: true,
      groups: [
        { title: 'Товары', kind: 'GOODS', entries: goods },
        { title: 'Услуги', kind: 'SERVICE', entries: services },
      ],
    };
  }
  return { grouped: false, groups: [{ title: '', kind: 'SERVICE', entries }] };
}

const INV_BORDER = 'border:1px solid #000;';
const INV_CELL = `${INV_BORDER} padding:3px 5px; font-size:10pt; vertical-align:top;`;

export function emptyPaymentInvoiceLineItem(
  lineKind: PaymentInvoiceLineKind = 'SERVICE'
): PaymentInvoiceLineItem {
  return {
    lineKind,
    name: '',
    quantity: '1',
    unit: 'шт.',
    vatLabel: 'Без НДС',
    unitPrice: '',
    amount: '',
  };
}

export function parsePaymentInvoiceLineAmount(raw: string): number | null {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function formatPaymentInvoiceLineAmount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '';
  return value.toFixed(2).replace('.', ',');
}

export function formatPaymentInvoiceQuantity(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '1,00';
  return value.toFixed(2).replace('.', ',');
}

/** Сумма позиций (руб.). */
export function sumPaymentInvoiceLineItems(lines: PaymentInvoiceLineItem[]): number {
  return lines.reduce((sum, line) => {
    const amt = parsePaymentInvoiceLineAmount(line.amount);
    return sum + (amt ?? 0);
  }, 0);
}

export function normalizePaymentInvoiceLineItem(
  raw: Partial<PaymentInvoiceLineItem>
): PaymentInvoiceLineItem {
  const quantityNum = parsePaymentInvoiceLineAmount(raw.quantity ?? '1') ?? 1;
  const amountNum = parsePaymentInvoiceLineAmount(raw.amount ?? '');
  const unitPriceNum = parsePaymentInvoiceLineAmount(raw.unitPrice ?? '');
  const amount =
    amountNum != null && amountNum > 0
      ? amountNum
      : unitPriceNum != null && unitPriceNum > 0
        ? quantityNum * unitPriceNum
        : 0;

  return {
    lineKind: normalizePaymentInvoiceLineKind(raw.lineKind),
    name: (raw.name ?? '').trim(),
    quantity: formatPaymentInvoiceQuantity(quantityNum || 1),
    unit: (raw.unit ?? 'шт.').trim() || 'шт.',
    vatLabel: (raw.vatLabel ?? 'Без НДС').trim() || 'Без НДС',
    unitPrice:
      unitPriceNum != null && unitPriceNum > 0
        ? formatPaymentInvoiceLineAmount(unitPriceNum)
        : amount > 0
          ? formatPaymentInvoiceLineAmount(amount / (quantityNum || 1))
          : '',
    amount: amount > 0 ? formatPaymentInvoiceLineAmount(amount) : '',
  };
}

export function normalizePaymentInvoiceLineItems(raw: unknown): PaymentInvoiceLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) =>
      row && typeof row === 'object'
        ? normalizePaymentInvoiceLineItem(row as Partial<PaymentInvoiceLineItem>)
        : emptyPaymentInvoiceLineItem()
    )
    .filter((line) => line.name || parsePaymentInvoiceLineAmount(line.amount));
}

export function paymentInvoiceLineItemsForApi(lines: PaymentInvoiceLineItem[]): Array<{
  name: string;
  quantity: string;
  unit: string;
  vatLabel: string;
  unitPrice: number;
  amount: number;
}> {
  return lines
    .map((line) => normalizePaymentInvoiceLineItem(line))
    .filter((line) => line.name && parsePaymentInvoiceLineAmount(line.amount))
    .map((line) => ({
      lineKind: line.lineKind,
      name: line.name,
      quantity: line.quantity,
      unit: line.unit,
      vatLabel: line.vatLabel,
      unitPrice: parsePaymentInvoiceLineAmount(line.unitPrice) ?? 0,
      amount: parsePaymentInvoiceLineAmount(line.amount) ?? 0,
    }));
}

const INVOICE_TABLE_COL_COUNT = 7;

function buildPaymentInvoiceGroupHeaderRow(title: string): string {
  return `<tr>
    <td colspan="${INVOICE_TABLE_COL_COUNT}" style="${INV_CELL} font-weight:bold; background:#f3f4f6;">${escapeHtml(title)}</td>
  </tr>`;
}

function buildPaymentInvoiceDataRow(line: PaymentInvoiceLineItem, rowNumber: number): string {
  const price = formatInvoiceMoneyAmount(line.unitPrice) || line.unitPrice;
  const sum = formatInvoiceMoneyAmount(line.amount) || line.amount;
  return `<tr>
    <td style="${INV_CELL} text-align:center;">${rowNumber}</td>
    <td style="${INV_CELL}">${escapeHtml(line.name)}</td>
    <td style="${INV_CELL} text-align:center;">${escapeHtml(line.quantity)}</td>
    <td style="${INV_CELL} text-align:center;">${escapeHtml(line.unit)}</td>
    <td style="${INV_CELL} text-align:center; white-space:nowrap;">${escapeHtml(line.vatLabel)}</td>
    <td style="${INV_CELL} text-align:right;">${escapeHtml(price)}</td>
    <td style="${INV_CELL} text-align:right;">${escapeHtml(sum)}</td>
  </tr>`;
}

export function buildPaymentInvoiceLinesTableHtml(lines: PaymentInvoiceLineItem[]): string {
  const rows = lines
    .map((line) => normalizePaymentInvoiceLineItem(line))
    .filter((line) => line.name && parsePaymentInvoiceLineAmount(line.amount));

  if (rows.length === 0) {
    return '';
  }

  const goods = rows.filter((line) => line.lineKind === 'GOODS');
  const services = rows.filter((line) => line.lineKind === 'SERVICE');
  const hasBoth = goods.length > 0 && services.length > 0;

  if (!hasBoth) {
    return rows.map((line, index) => buildPaymentInvoiceDataRow(line, index + 1)).join('');
  }

  const parts: string[] = [];
  let rowNumber = 0;
  if (goods.length > 0) {
    parts.push(buildPaymentInvoiceGroupHeaderRow('Товары'));
    for (const line of goods) {
      rowNumber += 1;
      parts.push(buildPaymentInvoiceDataRow(line, rowNumber));
    }
  }
  if (services.length > 0) {
    parts.push(buildPaymentInvoiceGroupHeaderRow('Услуги'));
    for (const line of services) {
      rowNumber += 1;
      parts.push(buildPaymentInvoiceDataRow(line, rowNumber));
    }
  }
  return parts.join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type PaymentInvoicePrintFields = {
  linesHtml: string;
  itemsCount: string;
  qrCodeHtml?: string;
};

export function buildPaymentInvoicePrintFields(
  lineItems: PaymentInvoiceLineItem[]
): PaymentInvoicePrintFields {
  const normalized = lineItems
    .map((line) => normalizePaymentInvoiceLineItem(line))
    .filter((line) => line.name && parsePaymentInvoiceLineAmount(line.amount));

  return {
    linesHtml: buildPaymentInvoiceLinesTableHtml(normalized),
    itemsCount: String(normalized.length),
  };
}
