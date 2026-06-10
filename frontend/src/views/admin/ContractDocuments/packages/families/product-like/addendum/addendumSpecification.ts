import { buildEstimateDocPrintFooterHtml } from '../../../platform/estimates/packageEstimateDocPrintEmbedHtml';
import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
} from '../../../platform/form/packageContractDiscount';
import type { PackageAddendumSlotEstimateBlock } from '../../../platform/form/packageForm';

export type ProductAddendumSpecificationLine = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
};

export type ProductAddendumSectionTotalMode = 'increase' | 'decrease';

export type ProductAddendumTotalsBreakdown = {
  specAddedTotal: number;
  specExcludedTotal: number;
  specNetTotal: number;
  accountAdditionalTotal: number;
  accountExcludedTotal: number;
  accountGrossNet: number;
  accountNetAfterDiscount: number;
  contractDiscountPercent: number;
  grandTotal: number;
  hasSpecAdded: boolean;
  hasSpecExcluded: boolean;
  hasAccountAdditional: boolean;
  hasAccountExcluded: boolean;
};

export function newProductAddendumSpecificationLine(): ProductAddendumSpecificationLine {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    name: '',
    quantity: '1',
    unit: 'шт.',
    price: '',
    amount: '',
  };
}

function parseDecimalInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function formatWindowsAddendumMoney(value: number): string {
  if (!Number.isFinite(value)) return '0,00';
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatWindowsAddendumSignedMoney(value: number): string {
  const formatted = formatWindowsAddendumMoney(Math.abs(value));
  if (value < 0) return `−${formatted}`;
  return formatted;
}

/** Сумма строки: всегда «Кол-во» × «Цена» (поле amount в форме не редактируется). */
export function resolveProductAddendumLineAmount(line: ProductAddendumSpecificationLine): number {
  const qty = parseDecimalInput(line.quantity);
  const price = parseDecimalInput(line.price);
  if (qty !== null && price !== null) return qty * price;
  return 0;
}

export function formatProductAddendumLineAmount(line: ProductAddendumSpecificationLine): string {
  return formatWindowsAddendumMoney(resolveProductAddendumLineAmount(line));
}

/** Строка попадает в печать и учёт слота только при реальных данных (не дефолт «1 шт.»). */
export function productAddendumSpecLineHasContent(line: ProductAddendumSpecificationLine): boolean {
  if (line.name.trim()) return true;
  const price = parseDecimalInput(line.price);
  if (price !== null && price !== 0) return true;
  if (resolveProductAddendumLineAmount(line) !== 0) return true;
  return false;
}

export function sumProductAddendumSpecificationLinesTotal(
  lines: ProductAddendumSpecificationLine[] | undefined
): number {
  return (lines ?? [])
    .filter(productAddendumSpecLineHasContent)
    .reduce((sum, line) => sum + resolveProductAddendumLineAmount(line), 0);
}

export function normalizeProductAddendumSpecificationLines(
  raw: unknown
): ProductAddendumSpecificationLine[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductAddendumSpecificationLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === 'string' && o.id.trim()
        ? o.id.trim()
        : newProductAddendumSpecificationLine().id;
    const line: ProductAddendumSpecificationLine = {
      id,
      name: typeof o.name === 'string' ? o.name : '',
      quantity: typeof o.quantity === 'string' && o.quantity.trim() ? o.quantity : '1',
      unit: typeof o.unit === 'string' && o.unit.trim() ? o.unit : 'шт.',
      price: typeof o.price === 'string' ? o.price : '',
      amount: '',
    };
    out.push({ ...line, amount: formatProductAddendumLineAmount(line) });
  }
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildWindowsAddendumSectionTotalHtml(
  total: number,
  mode: ProductAddendumSectionTotalMode
): string {
  if (!Number.isFinite(total)) return '';
  const label =
    mode === 'decrease' ? 'Итого по разделу (уменьшение стоимости)' : 'Итого по разделу';
  const signed =
    mode === 'decrease'
      ? `−${formatWindowsAddendumMoney(total)}`
      : formatWindowsAddendumMoney(total);
  return `<p class="windowsAddendumSectionTotal" style="margin:2pt 0 4pt;text-align:right;">${label}: ${signed} руб.</p>`;
}

function buildSpecificationLinesTableHtml(
  title: string,
  lines: ProductAddendumSpecificationLine[],
  totalMode: ProductAddendumSectionTotalMode
): { html: string; total: number } | null {
  const rows = lines.filter(productAddendumSpecLineHasContent);
  if (rows.length === 0) return null;
  let total = 0;
  const body = rows
    .map((line, index) => {
      const amount = resolveProductAddendumLineAmount(line);
      total += amount;
      return `<tr>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;">${index + 1}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;">${escapeHtml(line.name.trim() || '—')}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;">${escapeHtml(line.quantity.trim() || '—')}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;">${escapeHtml(line.unit.trim() || 'шт.')}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;">${formatWindowsAddendumMoney(parseDecimalInput(line.price) ?? 0)}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;">${formatWindowsAddendumMoney(amount)}</td>
</tr>`;
    })
    .join('');
  const html = `<h3 class="windowsAddendumSubsectionHeading">${escapeHtml(title)}</h3>
<table class="windowsAddendumSpecPrintTable" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:2pt 0;">
  <colgroup>
    <col style="width:3%;" />
    <col style="width:54%;" />
    <col style="width:7%;" />
    <col style="width:6%;" />
    <col style="width:15%;" />
    <col style="width:15%;" />
  </colgroup>
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;font-weight:normal;">№</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:left;font-weight:normal;">Наименование изделия</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;font-weight:normal;">Кол-во</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;font-weight:normal;">Ед.</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;font-weight:normal;">Цена, руб.</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;font-weight:normal;">Сумма, руб.</th>
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>
${buildWindowsAddendumSectionTotalHtml(total, totalMode)}`;
  return { html, total };
}

export function buildWindowsSpecificationPartHtml(slot: PackageAddendumSlotEstimateBlock): string {
  const added = buildSpecificationLinesTableHtml(
    'Дополнительные изделия к заказу',
    slot.specificationAddedLines ?? [],
    'increase'
  );
  const excluded = buildSpecificationLinesTableHtml(
    'Изделия, исключённые из заказа (или уменьшение количества)',
    slot.specificationExcludedLines ?? [],
    'decrease'
  );
  const parts: string[] = [];
  if (added) parts.push(added.html);
  if (excluded) parts.push(excluded.html);
  if (parts.length === 0) return '';
  return `<section class="windowsAddendumSpecPart"><h2 class="packageAddendumEstimateHeading">Изменения в Спецификации</h2>${parts.join('')}</section>`;
}

export function windowsAddendumSlotHasSpecificationContent(
  slot: PackageAddendumSlotEstimateBlock | undefined
): boolean {
  if (!slot) return false;
  return (
    (slot.specificationAddedLines ?? []).some(productAddendumSpecLineHasContent) ||
    (slot.specificationExcludedLines ?? []).some(productAddendumSpecLineHasContent)
  );
}

export function windowsAddendumSlotHasAccountOrderContent(
  slot: PackageAddendumSlotEstimateBlock | undefined
): boolean {
  if (!slot) return false;
  const hasAdditional =
    (slot.selectedPresetIds?.length ?? 0) > 0 ||
    Boolean(slot.snapshot?.rooms?.length) ||
    (typeof slot.snapshot?.total === 'number' && Number.isFinite(slot.snapshot.total));
  const hasExcluded =
    (slot.excludedSelectedPresetIds?.length ?? 0) > 0 ||
    Boolean(slot.excludedSnapshot?.rooms?.length) ||
    (typeof slot.excludedSnapshot?.total === 'number' &&
      Number.isFinite(slot.excludedSnapshot.total));
  return hasAdditional || hasExcluded;
}

export function windowsAddendumSlotHasAnyPrintContent(
  slot: PackageAddendumSlotEstimateBlock | undefined
): boolean {
  return (
    windowsAddendumSlotHasSpecificationContent(slot) ||
    windowsAddendumSlotHasAccountOrderContent(slot)
  );
}

export function computeWindowsAddendumTotals(options: {
  slot: PackageAddendumSlotEstimateBlock;
  accountAdditionalTotal: number;
  accountExcludedTotal: number;
  contractDiscountPercent?: string;
}): ProductAddendumTotalsBreakdown {
  const { slot } = options;
  const specAddedTotal = sumProductAddendumSpecificationLinesTotal(slot.specificationAddedLines);
  const specExcludedTotal = sumProductAddendumSpecificationLinesTotal(
    slot.specificationExcludedLines
  );
  const hasSpecAdded = (slot.specificationAddedLines ?? []).some(productAddendumSpecLineHasContent);
  const hasSpecExcluded = (slot.specificationExcludedLines ?? []).some(
    productAddendumSpecLineHasContent
  );
  const hasAccountAdditional = Boolean(
    (slot.selectedPresetIds?.length ?? 0) > 0 ||
    slot.snapshot?.rooms?.length ||
    (Number.isFinite(options.accountAdditionalTotal) && options.accountAdditionalTotal !== 0)
  );
  const hasAccountExcluded = Boolean(
    (slot.excludedSelectedPresetIds?.length ?? 0) > 0 ||
    slot.excludedSnapshot?.rooms?.length ||
    (Number.isFinite(options.accountExcludedTotal) && options.accountExcludedTotal !== 0)
  );
  const accountAdditionalTotal = Number.isFinite(options.accountAdditionalTotal)
    ? options.accountAdditionalTotal
    : 0;
  const accountExcludedTotal = Number.isFinite(options.accountExcludedTotal)
    ? options.accountExcludedTotal
    : 0;
  const accountGrossNet = accountAdditionalTotal - accountExcludedTotal;
  const contractDiscountPercent = parsePackageContractDiscountPercent(
    options.contractDiscountPercent ?? ''
  );
  let accountNetAfterDiscount = accountGrossNet;
  if (contractDiscountPercent > 0 && accountGrossNet > 0) {
    accountNetAfterDiscount = applyPackageContractDiscountToAmount(
      accountGrossNet,
      contractDiscountPercent
    );
  }
  const specNetTotal = specAddedTotal - specExcludedTotal;
  const grandTotal = specNetTotal + accountNetAfterDiscount;

  return {
    specAddedTotal,
    specExcludedTotal,
    specNetTotal,
    accountAdditionalTotal,
    accountExcludedTotal,
    accountGrossNet,
    accountNetAfterDiscount,
    contractDiscountPercent,
    grandTotal,
    hasSpecAdded,
    hasSpecExcluded,
    hasAccountAdditional,
    hasAccountExcluded,
  };
}

export function buildWindowsAddendumGrandTotalsHtml(
  breakdown: ProductAddendumTotalsBreakdown
): string {
  const grandSigned = formatWindowsAddendumSignedMoney(breakdown.grandTotal);
  return `<section class="windowsAddendumGrandTotals"><p class="estimateA4Total windowsAddendumGrandTotal" style="margin:4pt 0 2pt;text-align:right;">Итого по дополнительному соглашению: ${grandSigned} руб.</p></section>`;
}

/** Блок «2. Изменения в Счёт-заказе» — для печати Д/с и заказ-наряда по Д/с. */
export function buildWindowsAddendumAccountOrderPartHtml(options: {
  slot: PackageAddendumSlotEstimateBlock;
  additionalEmbedHtml: string;
  excludedEmbedHtml: string;
  accountAdditionalTotal: number;
  accountExcludedTotal: number;
  contractDiscountPercent: string;
}): string {
  if (!windowsAddendumSlotHasAccountOrderContent(options.slot)) return '';

  const breakdown = computeWindowsAddendumTotals({
    slot: options.slot,
    accountAdditionalTotal: options.accountAdditionalTotal,
    accountExcludedTotal: options.accountExcludedTotal,
    contractDiscountPercent: options.contractDiscountPercent,
  });

  const accountSections: string[] = [];
  if (options.additionalEmbedHtml.trim()) {
    accountSections.push(
      `<section><h3 class="windowsAddendumSubsectionHeading">Дополнительные работы</h3>${options.additionalEmbedHtml}${buildWindowsAddendumSectionTotalHtml(breakdown.accountAdditionalTotal, 'increase')}</section>`
    );
  }
  if (options.excludedEmbedHtml.trim()) {
    accountSections.push(
      `<section><h3 class="windowsAddendumSubsectionHeading">Непроводимые работы</h3>${options.excludedEmbedHtml}${buildWindowsAddendumSectionTotalHtml(breakdown.accountExcludedTotal, 'decrease')}</section>`
    );
  }
  if (accountSections.length === 0) return '';

  return `<section class="windowsAddendumAccountPart estimateA4DocPrintEmbed"><h2 class="packageAddendumEstimateHeading">Изменения в Счёт-заказе</h2>${accountSections.join('')}</section>`;
}

export function buildWindowsAddendumPrintHtml(options: {
  slot: PackageAddendumSlotEstimateBlock;
  additionalEmbedHtml: string;
  excludedEmbedHtml: string;
  accountAdditionalTotal: number;
  accountExcludedTotal: number;
  contractDiscountPercent: string;
  directorName: string;
  customerFullName: string;
}): string {
  if (!windowsAddendumSlotHasAnyPrintContent(options.slot)) return '';

  const breakdown = computeWindowsAddendumTotals({
    slot: options.slot,
    accountAdditionalTotal: options.accountAdditionalTotal,
    accountExcludedTotal: options.accountExcludedTotal,
    contractDiscountPercent: options.contractDiscountPercent,
  });

  const parts: string[] = [];
  const specPart = buildWindowsSpecificationPartHtml(options.slot);
  if (specPart) parts.push(specPart);

  const accountPart = buildWindowsAddendumAccountOrderPartHtml({
    slot: options.slot,
    additionalEmbedHtml: options.additionalEmbedHtml,
    excludedEmbedHtml: options.excludedEmbedHtml,
    accountAdditionalTotal: options.accountAdditionalTotal,
    accountExcludedTotal: options.accountExcludedTotal,
    contractDiscountPercent: options.contractDiscountPercent,
  });
  if (accountPart) parts.push(accountPart);

  parts.push(buildWindowsAddendumGrandTotalsHtml(breakdown));
  parts.push(
    buildEstimateDocPrintFooterHtml({
      directorName: options.directorName,
      customerFullName: options.customerFullName,
      executorPartyLabel: 'Исполнитель',
      includeHandwritingNote: false,
      repeatSignatures: false,
    })
  );

  return `<div class="windowsAddendumPrintCompact">${parts.join('')}</div>`;
}
