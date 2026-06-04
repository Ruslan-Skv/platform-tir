import {
  applyRepairContractDiscountToAmount,
  parseRepairContractDiscountPercent,
} from './repairContractDiscount';
import { buildEstimateDocPrintFooterHtml } from './repairEstimateDocPrintEmbedHtml';
import type { RepairAddendumSlotEstimateBlock } from './repairPackageForm';

export type WindowsAddendumSpecificationLine = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
};

export type WindowsAddendumSectionTotalMode = 'increase' | 'decrease';

export type WindowsAddendumTotalsBreakdown = {
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

export function newWindowsAddendumSpecificationLine(): WindowsAddendumSpecificationLine {
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
export function resolveWindowsAddendumLineAmount(line: WindowsAddendumSpecificationLine): number {
  const qty = parseDecimalInput(line.quantity);
  const price = parseDecimalInput(line.price);
  if (qty !== null && price !== null) return qty * price;
  return 0;
}

export function formatWindowsAddendumLineAmount(line: WindowsAddendumSpecificationLine): string {
  return formatWindowsAddendumMoney(resolveWindowsAddendumLineAmount(line));
}

/** Строка попадает в печать и учёт слота только при реальных данных (не дефолт «1 шт.»). */
export function windowsAddendumSpecLineHasContent(line: WindowsAddendumSpecificationLine): boolean {
  if (line.name.trim()) return true;
  const price = parseDecimalInput(line.price);
  if (price !== null && price !== 0) return true;
  if (resolveWindowsAddendumLineAmount(line) !== 0) return true;
  return false;
}

export function sumWindowsAddendumSpecificationLinesTotal(
  lines: WindowsAddendumSpecificationLine[] | undefined
): number {
  return (lines ?? [])
    .filter(windowsAddendumSpecLineHasContent)
    .reduce((sum, line) => sum + resolveWindowsAddendumLineAmount(line), 0);
}

export function normalizeWindowsAddendumSpecificationLines(
  raw: unknown
): WindowsAddendumSpecificationLine[] {
  if (!Array.isArray(raw)) return [];
  const out: WindowsAddendumSpecificationLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === 'string' && o.id.trim()
        ? o.id.trim()
        : newWindowsAddendumSpecificationLine().id;
    const line: WindowsAddendumSpecificationLine = {
      id,
      name: typeof o.name === 'string' ? o.name : '',
      quantity: typeof o.quantity === 'string' && o.quantity.trim() ? o.quantity : '1',
      unit: typeof o.unit === 'string' && o.unit.trim() ? o.unit : 'шт.',
      price: typeof o.price === 'string' ? o.price : '',
      amount: '',
    };
    out.push({ ...line, amount: formatWindowsAddendumLineAmount(line) });
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
  mode: WindowsAddendumSectionTotalMode
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
  lines: WindowsAddendumSpecificationLine[],
  totalMode: WindowsAddendumSectionTotalMode
): { html: string; total: number } | null {
  const rows = lines.filter(windowsAddendumSpecLineHasContent);
  if (rows.length === 0) return null;
  let total = 0;
  const body = rows
    .map((line, index) => {
      const amount = resolveWindowsAddendumLineAmount(line);
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

export function buildWindowsSpecificationPartHtml(slot: RepairAddendumSlotEstimateBlock): string {
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
  return `<section class="windowsAddendumSpecPart"><h2 class="repairAddendumEstimateHeading">Изменения в Спецификации</h2>${parts.join('')}</section>`;
}

export function windowsAddendumSlotHasSpecificationContent(
  slot: RepairAddendumSlotEstimateBlock | undefined
): boolean {
  if (!slot) return false;
  return (
    (slot.specificationAddedLines ?? []).some(windowsAddendumSpecLineHasContent) ||
    (slot.specificationExcludedLines ?? []).some(windowsAddendumSpecLineHasContent)
  );
}

export function windowsAddendumSlotHasAccountOrderContent(
  slot: RepairAddendumSlotEstimateBlock | undefined
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
  slot: RepairAddendumSlotEstimateBlock | undefined
): boolean {
  return (
    windowsAddendumSlotHasSpecificationContent(slot) ||
    windowsAddendumSlotHasAccountOrderContent(slot)
  );
}

export function computeWindowsAddendumTotals(options: {
  slot: RepairAddendumSlotEstimateBlock;
  accountAdditionalTotal: number;
  accountExcludedTotal: number;
  contractDiscountPercent?: string;
}): WindowsAddendumTotalsBreakdown {
  const { slot } = options;
  const specAddedTotal = sumWindowsAddendumSpecificationLinesTotal(slot.specificationAddedLines);
  const specExcludedTotal = sumWindowsAddendumSpecificationLinesTotal(
    slot.specificationExcludedLines
  );
  const hasSpecAdded = (slot.specificationAddedLines ?? []).some(windowsAddendumSpecLineHasContent);
  const hasSpecExcluded = (slot.specificationExcludedLines ?? []).some(
    windowsAddendumSpecLineHasContent
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
  const contractDiscountPercent = parseRepairContractDiscountPercent(
    options.contractDiscountPercent ?? ''
  );
  let accountNetAfterDiscount = accountGrossNet;
  if (contractDiscountPercent > 0 && accountGrossNet > 0) {
    accountNetAfterDiscount = applyRepairContractDiscountToAmount(
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
  breakdown: WindowsAddendumTotalsBreakdown
): string {
  const grandSigned = formatWindowsAddendumSignedMoney(breakdown.grandTotal);
  return `<section class="windowsAddendumGrandTotals"><p class="estimateA4Total windowsAddendumGrandTotal" style="margin:4pt 0 2pt;text-align:right;">Итого по дополнительному соглашению: ${grandSigned} руб.</p></section>`;
}

export function buildWindowsAddendumPrintHtml(options: {
  slot: RepairAddendumSlotEstimateBlock;
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

  if (windowsAddendumSlotHasAccountOrderContent(options.slot)) {
    const accountSections: string[] = [];
    if (options.additionalEmbedHtml) {
      accountSections.push(
        `<section><h3 class="windowsAddendumSubsectionHeading">Дополнительные работы</h3>${options.additionalEmbedHtml}${buildWindowsAddendumSectionTotalHtml(breakdown.accountAdditionalTotal, 'increase')}</section>`
      );
    }
    if (options.excludedEmbedHtml) {
      accountSections.push(
        `<section><h3 class="windowsAddendumSubsectionHeading">Непроводимые работы</h3>${options.excludedEmbedHtml}${buildWindowsAddendumSectionTotalHtml(breakdown.accountExcludedTotal, 'decrease')}</section>`
      );
    }
    if (accountSections.length > 0) {
      parts.push(
        `<section class="windowsAddendumAccountPart"><h2 class="repairAddendumEstimateHeading">Изменения в Счёт-заказе</h2>${accountSections.join('')}</section>`
      );
    }
  }

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
