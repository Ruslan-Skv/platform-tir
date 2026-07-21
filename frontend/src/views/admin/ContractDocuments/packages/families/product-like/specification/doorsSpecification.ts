import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { buildProductPackageSignaturesFooterHtml } from '../../../platform/estimates/estimateDocPrintSignatures';
import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
} from '../../../platform/form/packageContractDiscount';

export type DoorsSpecificationLine = {
  id: string;
  name: string;
  /** Двери: габарит одной строкой; у жалюзи обычно пусто (есть width/height). */
  size: string;
  /** Жалюзи: ширина. */
  width: string;
  /** Жалюзи: высота. */
  height: string;
  color: string;
  /** Двери: сторона открывания; Жалюзи: материал. */
  openingSide: string;
  /** Жалюзи: крепление. */
  mounting: string;
  /** Жалюзи: управление. */
  control: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

export type LineSpecificationAttributeColumnId =
  | 'name'
  | 'size'
  | 'width'
  | 'height'
  | 'color'
  | 'openingSide'
  | 'mounting'
  | 'control';

export type LineSpecificationColumnDef = {
  id: LineSpecificationAttributeColumnId;
  label: string;
  shortLabel?: string;
  title?: string;
  placeholder?: string;
};

/** Колонки характеристик до «Кол-во» — зависят от направления. */
export function lineSpecificationAttributeColumns(
  packageKind: ContractDocumentPackageKind | undefined | null
): LineSpecificationColumnDef[] {
  if (packageKind === 'BLINDS') {
    return [
      { id: 'name', label: 'Модель', placeholder: 'Модель…' },
      { id: 'width', label: 'Ширина (мм)', placeholder: '1200' },
      { id: 'height', label: 'Высота (мм)', placeholder: '1500' },
      { id: 'color', label: 'Цвет', placeholder: 'Белый' },
      { id: 'openingSide', label: 'Материал', placeholder: 'Алюминий' },
      { id: 'mounting', label: 'Крепление', placeholder: 'К потолку' },
      { id: 'control', label: 'Управление', placeholder: 'Шнур' },
    ];
  }
  return [
    {
      id: 'name',
      label: 'Наименование',
      placeholder: 'Дверь, фурнитура, наличник…',
    },
    { id: 'size', label: 'Размер', placeholder: '800×2000' },
    { id: 'color', label: 'Цвет', placeholder: 'Белый' },
    {
      id: 'openingSide',
      label: 'Сторона открывания (Тип)',
      shortLabel: 'Сторона откр.',
      title: 'Сторона открывания (Тип)',
      placeholder: 'Левая',
    },
  ];
}

export function lineSpecificationAttributeValue(
  line: DoorsSpecificationLine,
  columnId: LineSpecificationAttributeColumnId
): string {
  return line[columnId] ?? '';
}

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
    width: '',
    height: '',
    color: '',
    openingSide: '',
    mounting: '',
    control: '',
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
  if (
    line.name.trim() ||
    line.size.trim() ||
    line.width.trim() ||
    line.height.trim() ||
    line.color.trim() ||
    line.openingSide.trim() ||
    line.mounting.trim() ||
    line.control.trim()
  ) {
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
  lines: DoorsSpecificationLine[] | undefined,
  discountPercentRaw: string
): string {
  const hasPositions = (lines ?? []).some(doorsSpecificationLineHasContent);
  if (!hasPositions) {
    return `<p class="estimateA4Empty">Позиции не заполнены.</p>`;
  }
  const { grossTotal, discountPercent, netTotal } = computeDoorsSpecificationNetTotal(
    lines,
    discountPercentRaw
  );
  if (discountPercent > 0) {
    return `<p class="estimateA4Total">Итого по спецификации (без скидки): <strong>${formatDoorsSpecificationMoney(grossTotal)} руб.</strong></p>
<p class="estimateA4DiscountMeta">Скидка по спецификации: ${String(discountPercent).replace('.', ',')}%</p>
<p class="estimateA4Total">Итого со скидкой: <strong>${formatDoorsSpecificationMoney(netTotal)} руб.</strong></p>`;
  }
  return `<p class="estimateA4Total">Итого по спецификации: <strong>${formatDoorsSpecificationMoney(grossTotal)} руб.</strong></p>`;
}

/** Разбор legacy «Размер» (800×2000 / 800x2000) в ширину и высоту для жалюзи. */
function splitLegacySize(sizeRaw: string): { width: string; height: string } {
  const size = sizeRaw.trim();
  if (!size) return { width: '', height: '' };
  const parts = size.split(/\s*[×xXхХ]\s*/);
  if (parts.length >= 2) {
    return { width: parts[0]?.trim() ?? '', height: parts[1]?.trim() ?? '' };
  }
  return { width: size, height: '' };
}

export function normalizeDoorsSpecificationLines(raw: unknown): DoorsSpecificationLine[] {
  if (!Array.isArray(raw)) return [];
  const out: DoorsSpecificationLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === 'string' && o.id.trim() ? o.id.trim() : newDoorsSpecificationLine().id;
    const size = typeof o.size === 'string' ? o.size : '';
    let width = typeof o.width === 'string' ? o.width : '';
    let height = typeof o.height === 'string' ? o.height : '';
    if (!width.trim() && !height.trim() && size.trim()) {
      const split = splitLegacySize(size);
      width = split.width;
      height = split.height;
    }
    const line: DoorsSpecificationLine = {
      id,
      name: typeof o.name === 'string' ? o.name : '',
      size,
      width,
      height,
      color: typeof o.color === 'string' ? o.color : '',
      openingSide: typeof o.openingSide === 'string' ? o.openingSide : '',
      mounting: typeof o.mounting === 'string' ? o.mounting : '',
      control: typeof o.control === 'string' ? o.control : '',
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

function th(label: string): string {
  return `<th style="border:1px solid #cbd5e1;padding:1px 2px;font-weight:normal;text-align:center;">${escapeHtml(label)}</th>`;
}

export function buildDoorsSpecificationTableBodyHtml(
  lines: DoorsSpecificationLine[],
  packageKind?: ContractDocumentPackageKind | null
): string {
  const rows = lines.filter(doorsSpecificationLineHasContent);
  if (rows.length === 0) return '';
  const attrs = lineSpecificationAttributeColumns(packageKind);
  return rows
    .map((line, index) => {
      const total = resolveDoorsSpecificationLineTotal(line);
      const unitPrice = parseDecimalInput(line.unitPrice);
      const attrCells = attrs
        .map((col) => cell(lineSpecificationAttributeValue(line, col.id)))
        .join('\n  ');
      return `<tr>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;">${index + 1}</td>
  ${attrCells}
  ${cell(line.quantity, 'right')}
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;">${formatDoorsSpecificationMoney(unitPrice ?? 0)}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;">${formatDoorsSpecificationMoney(total)}</td>
</tr>`;
    })
    .join('');
}

const DOORS_DELIVERY_NOTE_PRODUCTS_MARKER = 'doorsDeliveryNoteProducts';

/** Таблица изделий для накладной — те же позиции, что в спецификации (без сумм). */
export function buildDoorsDeliveryNoteProductsHtml(
  lines: DoorsSpecificationLine[] | undefined,
  packageKind?: ContractDocumentPackageKind | null
): string {
  const rows = (lines ?? []).filter(doorsSpecificationLineHasContent);
  if (rows.length === 0) {
    return `<div class="${DOORS_DELIVERY_NOTE_PRODUCTS_MARKER}"><p class="estimateA4Empty">Позиции спецификации не заполнены.</p></div>`;
  }
  const attrs = lineSpecificationAttributeColumns(packageKind);
  const body = rows
    .map((line, index) => {
      const attrCells = attrs
        .map((col) => cell(lineSpecificationAttributeValue(line, col.id)))
        .join('\n  ');
      return `<tr>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;">${index + 1}</td>
  ${attrCells}
  ${cell(line.quantity, 'right')}
</tr>`;
    })
    .join('');
  const attrCols = attrs
    .map(() => `<col style="width:${Math.floor(78 / attrs.length)}%;" />`)
    .join('\n    ');
  const attrHeads = attrs.map((col) => th(col.label)).join('\n      ');
  return `<div class="${DOORS_DELIVERY_NOTE_PRODUCTS_MARKER}">
<table class="doorsDeliveryNoteProductsTable" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:8pt 0 10pt;">
  <colgroup>
    <col style="width:5%;" />
    ${attrCols}
    <col style="width:10%;" />
  </colgroup>
  <thead>
    <tr>
      ${th('№')}
      ${attrHeads}
      ${th('Кол-во')}
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>
</div>`;
}

/**
 * Вставляет таблицу изделий в HTML накладной, если шаблон ещё без
 * `{{deliveryNote.productsHtml}}` (старые пресеты библиотеки).
 */
export function ensureDoorsDeliveryNoteProductsHtml(
  renderedHtml: string,
  productsHtml: string
): string {
  if (!productsHtml.trim()) return renderedHtml;
  if (renderedHtml.includes(DOORS_DELIVERY_NOTE_PRODUCTS_MARKER)) return renderedHtml;
  const signTableRe = /(<table\b[^>]*\bclass="[^"]*\bsignTable\b)/i;
  if (signTableRe.test(renderedHtml)) {
    return renderedHtml.replace(signTableRe, `${productsHtml}$1`);
  }
  const lastClose = renderedHtml.lastIndexOf('</div>');
  if (lastClose >= 0) {
    return `${renderedHtml.slice(0, lastClose)}${productsHtml}${renderedHtml.slice(lastClose)}`;
  }
  return `${renderedHtml}${productsHtml}`;
}

export function buildDoorsSpecificationSheetHtml(input: {
  contractNumberLabel: string;
  contractDateLabel: string;
  lines: DoorsSpecificationLine[];
  directorName: string;
  customerFullName: string;
  discountPercent?: string;
  packageKind?: ContractDocumentPackageKind | null;
}): string {
  const body = buildDoorsSpecificationTableBodyHtml(input.lines, input.packageKind);
  const attrs = lineSpecificationAttributeColumns(input.packageKind);
  const attrShare = Math.floor(65 / Math.max(attrs.length, 1));
  const attrCols = attrs.map(() => `<col style="width:${attrShare}%;" />`).join('\n    ');
  const attrHeads = attrs.map((col) => th(col.label)).join('\n      ');
  const specLayout = input.packageKind === 'BLINDS' ? 'blinds' : 'doors';
  const table = body
    ? `<table class="doorsSpecificationA4Table" data-spec-layout="${specLayout}" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:6pt 0 8pt;">
  <colgroup>
    <col style="width:4%;" />
    ${attrCols}
    <col style="width:7%;" />
    <col style="width:12%;" />
    <col style="width:12%;" />
  </colgroup>
  <thead>
    <tr>
      ${th('№')}
      ${attrHeads}
      ${th('Кол-во')}
      ${th('Стоимость')}
      ${th('Сумма')}
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>`
    : '';
  const totalBlock = buildDoorsSpecificationTotalsHtml(input.lines, input.discountPercent ?? '');

  return `<p class="estimateA4AppendixRef">Приложение №1 к договору № ${escapeHtml(input.contractNumberLabel)} от ${escapeHtml(input.contractDateLabel)}</p>
<h4 class="estimateA4Title">Спецификация</h4>
${table}
${totalBlock}
${buildProductPackageSignaturesFooterHtml({
  directorName: input.directorName,
  customerFullName: input.customerFullName,
})}`;
}
