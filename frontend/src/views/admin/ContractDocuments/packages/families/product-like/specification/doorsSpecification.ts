import { buildProductPackageSignaturesFooterHtml } from '../../../platform/estimates/estimateDocPrintSignatures';
import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
} from '../../../platform/form/packageContractDiscount';

export type DoorsSpecificationLine = {
  id: string;
  name: string;
  size: string;
  color: string;
  openingSide: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

function parseDecimalInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function formatDoorsSpecificationMoney(value: number): string {
  if (!Number.isFinite(value)) return '0,00';
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function newDoorsSpecificationLine(): DoorsSpecificationLine {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    name: '',
    size: '',
    color: '',
    openingSide: '',
    quantity: '1',
    unitPrice: '',
    lineTotal: '',
  };
}

export function resolveDoorsSpecificationLineTotal(line: DoorsSpecificationLine): number {
  const qty = parseDecimalInput(line.quantity);
  const price = parseDecimalInput(line.unitPrice);
  if (qty !== null && price !== null) return qty * price;
  return 0;
}

export function formatDoorsSpecificationLineTotal(line: DoorsSpecificationLine): string {
  return formatDoorsSpecificationMoney(resolveDoorsSpecificationLineTotal(line));
}

export function formatDoorsSpecificationUnitPrice(line: DoorsSpecificationLine): string {
  const price = parseDecimalInput(line.unitPrice);
  return formatDoorsSpecificationMoney(price ?? 0);
}

export function doorsSpecificationLineHasContent(line: DoorsSpecificationLine): boolean {
  if (line.name.trim() || line.size.trim() || line.color.trim() || line.openingSide.trim()) {
    return true;
  }
  const price = parseDecimalInput(line.unitPrice);
  if (price !== null && price !== 0) return true;
  return resolveDoorsSpecificationLineTotal(line) !== 0;
}

export function sumDoorsSpecificationLinesTotal(
  lines: DoorsSpecificationLine[] | undefined
): number {
  return (lines ?? [])
    .filter(doorsSpecificationLineHasContent)
    .reduce((sum, line) => sum + resolveDoorsSpecificationLineTotal(line), 0);
}

export function computeDoorsSpecificationNetTotal(
  lines: DoorsSpecificationLine[] | undefined,
  discountPercentRaw: string
): { grossTotal: number; discountPercent: number; netTotal: number } {
  const grossTotal = sumDoorsSpecificationLinesTotal(lines);
  const discountPercent = parsePackageContractDiscountPercent(discountPercentRaw);
  const netTotal = applyPackageContractDiscountToAmount(grossTotal, discountPercent);
  return { grossTotal, discountPercent, netTotal };
}

export function buildDoorsSpecificationTotalsHtml(
  grossTotal: number,
  discountPercentRaw: string
): string {
  if (grossTotal <= 0) {
    return `<p class="estimateA4Empty">Позиции не заполнены.</p>`;
  }
  const discountPercent = parsePackageContractDiscountPercent(discountPercentRaw);
  if (discountPercent > 0) {
    const netTotal = applyPackageContractDiscountToAmount(grossTotal, discountPercent);
    return `<p class="estimateA4Total">Итого по спецификации (без скидки): <strong>${formatDoorsSpecificationMoney(grossTotal)} руб.</strong></p>
<p class="estimateA4DiscountMeta">Скидка по спецификации: ${String(discountPercent).replace('.', ',')}%</p>
<p class="estimateA4Total">Итого со скидкой: <strong>${formatDoorsSpecificationMoney(netTotal)} руб.</strong></p>`;
  }
  return `<p class="estimateA4Total">Итого по спецификации: <strong>${formatDoorsSpecificationMoney(grossTotal)} руб.</strong></p>`;
}

export function normalizeDoorsSpecificationLines(raw: unknown): DoorsSpecificationLine[] {
  if (!Array.isArray(raw)) return [];
  const out: DoorsSpecificationLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === 'string' && o.id.trim() ? o.id.trim() : newDoorsSpecificationLine().id;
    const line: DoorsSpecificationLine = {
      id,
      name: typeof o.name === 'string' ? o.name : '',
      size: typeof o.size === 'string' ? o.size : '',
      color: typeof o.color === 'string' ? o.color : '',
      openingSide: typeof o.openingSide === 'string' ? o.openingSide : '',
      quantity: typeof o.quantity === 'string' && o.quantity.trim() ? o.quantity : '1',
      unitPrice: typeof o.unitPrice === 'string' ? o.unitPrice : '',
      lineTotal: '',
    };
    out.push({ ...line, lineTotal: formatDoorsSpecificationLineTotal(line) });
  }
  return out;
}

export function ensureAtLeastOneDoorsSpecificationLine(
  lines: DoorsSpecificationLine[]
): DoorsSpecificationLine[] {
  return lines.length > 0 ? lines : [newDoorsSpecificationLine()];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cell(value: string, align: 'left' | 'center' | 'right' = 'left'): string {
  return `<td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:${align};">${escapeHtml(value.trim() || '—')}</td>`;
}

export function buildDoorsSpecificationTableBodyHtml(lines: DoorsSpecificationLine[]): string {
  const rows = lines.filter(doorsSpecificationLineHasContent);
  if (rows.length === 0) return '';
  return rows
    .map((line, index) => {
      const total = resolveDoorsSpecificationLineTotal(line);
      const unitPrice = parseDecimalInput(line.unitPrice);
      return `<tr>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;">${index + 1}</td>
  ${cell(line.name)}
  ${cell(line.size)}
  ${cell(line.color)}
  ${cell(line.openingSide)}
  ${cell(line.quantity, 'right')}
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;">${formatDoorsSpecificationMoney(unitPrice ?? 0)}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;">${formatDoorsSpecificationMoney(total)}</td>
</tr>`;
    })
    .join('');
}

export function buildDoorsSpecificationSheetHtml(input: {
  contractNumberLabel: string;
  contractDateLabel: string;
  lines: DoorsSpecificationLine[];
  directorName: string;
  customerFullName: string;
  discountPercent?: string;
}): string {
  const body = buildDoorsSpecificationTableBodyHtml(input.lines);
  const { grossTotal } = computeDoorsSpecificationNetTotal(
    input.lines,
    input.discountPercent ?? ''
  );
  const table = body
    ? `<table class="doorsSpecificationA4Table" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:6pt 0 8pt;">
  <colgroup>
    <col style="width:4%;" />
    <col style="width:24%;" />
    <col style="width:11%;" />
    <col style="width:10%;" />
    <col style="width:14%;" />
    <col style="width:7%;" />
    <col style="width:15%;" />
    <col style="width:15%;" />
  </colgroup>
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;font-weight:normal;text-align:center;">№</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;font-weight:normal;">Наименование</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;font-weight:normal;">Размер</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;font-weight:normal;">Цвет</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;font-weight:normal;">Сторона открывания (Тип)</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;font-weight:normal;">Кол-во</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;font-weight:normal;">Стоимость</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;font-weight:normal;">Сумма</th>
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>`
    : '';
  const totalBlock = buildDoorsSpecificationTotalsHtml(grossTotal, input.discountPercent ?? '');

  return `<p class="estimateA4AppendixRef">Приложение №1 к договору № ${escapeHtml(input.contractNumberLabel)} от ${escapeHtml(input.contractDateLabel)}</p>
<h4 class="estimateA4Title">Спецификация</h4>
${table}
${totalBlock}
${buildProductPackageSignaturesFooterHtml({
  directorName: input.directorName,
  customerFullName: input.customerFullName,
})}`;
}
