import { buildProductPackageSignaturesFooterHtml } from '../../../platform/estimates/estimateDocPrintSignatures';
import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
} from '../../../platform/form/packageContractDiscount';
import type { CeilingsPriceItem } from './ceilingsPriceTypes';
import { resolveCeilingsRetailPrice } from './ceilingsPriceTypes';

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type CeilingsFabricLine = {
  id: string;
  priceItemId: string;
  texture: string;
  /** Серия / ширина (2-й список ПрайсП), напр. Мцв320 */
  series: string;
  /** Цвет / артикул цвета (3-й список), напр. М03 — пусто если у серии нет цветов */
  color: string;
  article: string;
  qtyM2: string;
  unitPrice: string;
};

export type CeilingsTapeLine = {
  priceItemId: string;
  kind: string;
  color: string;
  qtyM: string;
  unitPrice: string;
};

export type CeilingsNamedQtyLine = {
  id: string;
  priceItemId: string;
  name: string;
  qty: string;
  unitPrice: string;
  unit: string;
};

export type CeilingsCeilingBlock = {
  id: string;
  title: string;
  fabrics: CeilingsFabricLine[];
  tape: CeilingsTapeLine | null;
  profiles: CeilingsNamedQtyLine[];
  extras: CeilingsNamedQtyLine[];
  goods: CeilingsNamedQtyLine[];
};

export type CeilingsSpecification = {
  extraMarkupPercent: string;
  discountPercent: string;
  ceilings: CeilingsCeilingBlock[];
};

export function newCeilingsFabricLine(partial?: Partial<CeilingsFabricLine>): CeilingsFabricLine {
  return {
    id: newId('fabric'),
    priceItemId: '',
    texture: '',
    series: '',
    color: '',
    article: '',
    qtyM2: '',
    unitPrice: '',
    ...partial,
  };
}

export function newCeilingsNamedQtyLine(
  partial?: Partial<CeilingsNamedQtyLine>
): CeilingsNamedQtyLine {
  return {
    id: newId('line'),
    priceItemId: '',
    name: '',
    qty: '',
    unitPrice: '',
    unit: 'шт',
    ...partial,
  };
}

export function newCeilingsCeilingBlock(index = 1): CeilingsCeilingBlock {
  return {
    id: newId('ceiling'),
    title: `Потолок №${index}`,
    fabrics: [newCeilingsFabricLine()],
    tape: null,
    profiles: [],
    extras: [],
    goods: [],
  };
}

export function defaultCeilingsSpecification(
  defaultExtraMarkupPercent = 10
): CeilingsSpecification {
  return {
    extraMarkupPercent: String(defaultExtraMarkupPercent),
    discountPercent: '',
    ceilings: [newCeilingsCeilingBlock(1)],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function normalizeCeilingsSpecification(raw: unknown): CeilingsSpecification {
  const o = asRecord(raw);
  if (!o) return defaultCeilingsSpecification();
  const ceilingsRaw = Array.isArray(o.ceilings) ? o.ceilings : [];
  const ceilings = ceilingsRaw
    .map((item, index) => {
      const c = asRecord(item);
      if (!c) return null;
      const fabrics = (Array.isArray(c.fabrics) ? c.fabrics : [])
        .map((f) => {
          const row = asRecord(f);
          if (!row) return null;
          return {
            id: str(row.id, newId('fabric')),
            priceItemId: str(row.priceItemId),
            texture: str(row.texture),
            series: str(row.series) || str(row.article),
            color: str(row.color),
            article: str(row.article),
            qtyM2: str(row.qtyM2),
            unitPrice: str(row.unitPrice),
          };
        })
        .filter(Boolean) as CeilingsFabricLine[];
      const tapeRaw = asRecord(c.tape);
      const tape: CeilingsTapeLine | null = tapeRaw
        ? {
            priceItemId: str(tapeRaw.priceItemId),
            kind: str(tapeRaw.kind),
            color: str(tapeRaw.color),
            qtyM: str(tapeRaw.qtyM),
            unitPrice: str(tapeRaw.unitPrice),
          }
        : null;
      const mapNamed = (list: unknown): CeilingsNamedQtyLine[] =>
        (Array.isArray(list) ? list : [])
          .map((x) => {
            const row = asRecord(x);
            if (!row) return null;
            return {
              id: str(row.id, newId('line')),
              priceItemId: str(row.priceItemId),
              name: str(row.name),
              qty: str(row.qty),
              unitPrice: str(row.unitPrice),
              unit: str(row.unit, 'шт'),
            };
          })
          .filter(Boolean) as CeilingsNamedQtyLine[];
      return {
        id: str(c.id, newId('ceiling')),
        title: str(c.title, `Потолок №${index + 1}`),
        fabrics: fabrics.length > 0 ? fabrics : [newCeilingsFabricLine()],
        tape,
        profiles: mapNamed(c.profiles),
        extras: mapNamed(c.extras),
        goods: mapNamed(c.goods),
      } satisfies CeilingsCeilingBlock;
    })
    .filter(Boolean) as CeilingsCeilingBlock[];

  return {
    extraMarkupPercent: str(o.extraMarkupPercent, '10'),
    discountPercent: str(o.discountPercent),
    ceilings: ceilings.length > 0 ? ceilings : [newCeilingsCeilingBlock(1)],
  };
}

export function parseCeilingsQty(raw: string): number | null {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function formatCeilingsMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function lineAmount(qtyRaw: string, priceRaw: string): number {
  const qty = parseCeilingsQty(qtyRaw);
  const price = parseCeilingsQty(priceRaw);
  if (qty == null || price == null) return 0;
  return qty * price;
}

export function sumCeilingsCeilingGross(ceiling: CeilingsCeilingBlock): number {
  let sum = 0;
  for (const f of ceiling.fabrics) sum += lineAmount(f.qtyM2, f.unitPrice);
  if (ceiling.tape) sum += lineAmount(ceiling.tape.qtyM, ceiling.tape.unitPrice);
  for (const p of ceiling.profiles) sum += lineAmount(p.qty, p.unitPrice);
  for (const e of ceiling.extras) sum += lineAmount(e.qty, e.unitPrice);
  for (const g of ceiling.goods) sum += lineAmount(g.qty, g.unitPrice);
  return sum;
}

export function ceilingsSpecificationHasContent(spec: CeilingsSpecification): boolean {
  return spec.ceilings.some((c) => sumCeilingsCeilingGross(c) > 0 || ceilingHasFilledFields(c));
}

function ceilingHasFilledFields(c: CeilingsCeilingBlock): boolean {
  if (c.fabrics.some((f) => f.article.trim() || f.texture.trim() || f.qtyM2.trim())) return true;
  if (c.tape && (c.tape.color.trim() || c.tape.qtyM.trim())) return true;
  if (c.profiles.some((p) => p.name.trim() || p.qty.trim())) return true;
  if (c.extras.some((p) => p.name.trim() || p.qty.trim())) return true;
  if (c.goods.some((p) => p.name.trim() || p.qty.trim())) return true;
  return false;
}

export function computeCeilingsSpecificationNetTotal(spec: CeilingsSpecification): {
  grossTotal: number;
  withExtraMarkup: number;
  extraMarkupPercent: number;
  discountPercent: number;
  netTotal: number;
} {
  const grossTotal = spec.ceilings.reduce((s, c) => s + sumCeilingsCeilingGross(c), 0);
  const extraMarkupPercent = parsePackageContractDiscountPercent(spec.extraMarkupPercent);
  const withExtraMarkup =
    extraMarkupPercent > 0 ? grossTotal * (1 + extraMarkupPercent / 100) : grossTotal;
  const discountPercent = parsePackageContractDiscountPercent(spec.discountPercent);
  const netTotal = applyPackageContractDiscountToAmount(withExtraMarkup, discountPercent);
  return { grossTotal, withExtraMarkup, extraMarkupPercent, discountPercent, netTotal };
}

export type CeilingsFlatPrintRow = {
  ceilingTitle: string;
  name: string;
  detail: string;
  qty: string;
  unit: string;
  unitPrice: string;
  amount: number;
};

export function flattenCeilingsSpecificationRows(
  spec: CeilingsSpecification
): CeilingsFlatPrintRow[] {
  const rows: CeilingsFlatPrintRow[] = [];
  for (const ceiling of spec.ceilings) {
    if (!ceilingHasFilledFields(ceiling) && sumCeilingsCeilingGross(ceiling) <= 0) continue;
    for (const f of ceiling.fabrics) {
      if (!f.article.trim() && !f.texture.trim() && !f.qtyM2.trim()) continue;
      const amount = lineAmount(f.qtyM2, f.unitPrice);
      rows.push({
        ceilingTitle: ceiling.title,
        name: 'Полотно',
        detail: [f.texture, f.series || f.article, f.color].filter(Boolean).join(' · '),
        qty: f.qtyM2 || '—',
        unit: 'м²',
        unitPrice: f.unitPrice || '0',
        amount,
      });
    }
    if (ceiling.tape && (ceiling.tape.color.trim() || ceiling.tape.qtyM.trim())) {
      rows.push({
        ceilingTitle: ceiling.title,
        name: ceiling.tape.kind === 'mask_x' ? 'Маск.лента.Х' : 'Маск.лента',
        detail: ceiling.tape.color,
        qty: ceiling.tape.qtyM || '—',
        unit: 'м',
        unitPrice: ceiling.tape.unitPrice || '0',
        amount: lineAmount(ceiling.tape.qtyM, ceiling.tape.unitPrice),
      });
    }
    const pushNamed = (list: CeilingsNamedQtyLine[], fallbackName: string) => {
      for (const p of list) {
        if (!p.name.trim() && !p.qty.trim()) continue;
        rows.push({
          ceilingTitle: ceiling.title,
          name: p.name.trim() || fallbackName,
          detail: '',
          qty: p.qty || '—',
          unit: p.unit || 'шт',
          unitPrice: p.unitPrice || '0',
          amount: lineAmount(p.qty, p.unitPrice),
        });
      }
    };
    pushNamed(ceiling.profiles, 'Багет');
    pushNamed(ceiling.extras, 'Доп.');
    pushNamed(ceiling.goods, 'Товар');
  }
  return rows;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildCeilingsSpecificationSheetHtml(input: {
  contractNumberLabel: string;
  contractDateLabel: string;
  directorName: string;
  customerFullName: string;
  spec: CeilingsSpecification;
}): string {
  const rows = flattenCeilingsSpecificationRows(input.spec);
  const totals = computeCeilingsSpecificationNetTotal(input.spec);
  const body = rows
    .map(
      (r) => `<tr>
  <td style="border:1px solid #cbd5e1;padding:2px 4px;">${escapeHtml(r.ceilingTitle)}</td>
  <td style="border:1px solid #cbd5e1;padding:2px 4px;">${escapeHtml(r.name)}</td>
  <td style="border:1px solid #cbd5e1;padding:2px 4px;">${escapeHtml(r.detail || '—')}</td>
  <td style="border:1px solid #cbd5e1;padding:2px 4px;text-align:right;">${escapeHtml(r.qty)} ${escapeHtml(r.unit)}</td>
  <td style="border:1px solid #cbd5e1;padding:2px 4px;text-align:right;">${escapeHtml(formatCeilingsMoney(parseCeilingsQty(r.unitPrice) ?? 0))}</td>
  <td style="border:1px solid #cbd5e1;padding:2px 4px;text-align:right;">${escapeHtml(formatCeilingsMoney(r.amount))}</td>
</tr>`
    )
    .join('');

  const table = rows.length
    ? `<table class="doorsSpecificationA4Table" data-spec-layout="ceilings" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:6pt 0 8pt;">
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1;padding:2px 4px;">Потолок</th>
      <th style="border:1px solid #cbd5e1;padding:2px 4px;">Наименование</th>
      <th style="border:1px solid #cbd5e1;padding:2px 4px;">Фактура / артикул / цвет</th>
      <th style="border:1px solid #cbd5e1;padding:2px 4px;">Кол-во</th>
      <th style="border:1px solid #cbd5e1;padding:2px 4px;">Цена</th>
      <th style="border:1px solid #cbd5e1;padding:2px 4px;">Стоимость</th>
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>`
    : '';

  let totalsHtml = `<p class="estimateA4Empty">Позиции не заполнены.</p>`;
  if (ceilingsSpecificationHasContent(input.spec)) {
    const parts: string[] = [];
    parts.push(
      `<p class="estimateA4Total">Итого по спецификации: <strong>${escapeHtml(formatCeilingsMoney(totals.grossTotal))} руб.</strong></p>`
    );
    if (totals.extraMarkupPercent > 0) {
      parts.push(
        `<p class="estimateA4DiscountMeta">Доп. наценка: ${String(totals.extraMarkupPercent).replace('.', ',')}%</p>`
      );
      parts.push(
        `<p class="estimateA4Total">С учётом наценки: <strong>${escapeHtml(formatCeilingsMoney(totals.withExtraMarkup))} руб.</strong></p>`
      );
    }
    if (totals.discountPercent > 0) {
      parts.push(
        `<p class="estimateA4DiscountMeta">Скидка по спецификации: ${String(totals.discountPercent).replace('.', ',')}%</p>`
      );
      parts.push(
        `<p class="estimateA4Total">Итого со скидкой: <strong>${escapeHtml(formatCeilingsMoney(totals.netTotal))} руб.</strong></p>`
      );
    }
    totalsHtml = parts.join('\n');
  }

  return `<p class="estimateA4AppendixRef">Приложение №1 к договору № ${escapeHtml(input.contractNumberLabel)} от ${escapeHtml(input.contractDateLabel)}</p>
<h4 class="estimateA4Title">Спецификация</h4>
<p class="estimateA4DiscountMeta">При выборе потолков учитывать: полотно №1 — самое большое.</p>
${table}
${totalsHtml}
${buildProductPackageSignaturesFooterHtml({
  directorName: input.directorName,
  customerFullName: input.customerFullName,
})}`;
}

export function buildCeilingsDeliveryNoteProductsHtml(spec: CeilingsSpecification): string {
  const rows = flattenCeilingsSpecificationRows(spec).filter((r) => r.qty !== '—' || r.name);
  if (rows.length === 0) {
    return `<div class="doorsDeliveryNoteProducts"><p class="estimateA4Empty">Позиции спецификации не заполнены.</p></div>`;
  }
  const body = rows
    .map(
      (r, i) => `<tr>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:center;">${i + 1}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;">${escapeHtml(r.ceilingTitle)}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;">${escapeHtml(r.name)}${r.detail ? ` (${escapeHtml(r.detail)})` : ''}</td>
  <td style="border:1px solid #cbd5e1;padding:1px 2px;text-align:right;">${escapeHtml(r.qty)} ${escapeHtml(r.unit)}</td>
</tr>`
    )
    .join('');
  return `<div class="doorsDeliveryNoteProducts">
<table class="doorsDeliveryNoteProductsTable" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:8pt 0 10pt;">
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;">№</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;">Потолок</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;">Наименование</th>
      <th style="border:1px solid #cbd5e1;padding:1px 2px;">Кол-во</th>
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>
</div>`;
}

export function applyPriceItemToFabric(
  line: CeilingsFabricLine,
  item: CeilingsPriceItem
): CeilingsFabricLine {
  const texture =
    typeof item.attributes.texture === 'string' ? item.attributes.texture : line.texture;
  const series =
    typeof item.attributes.series === 'string'
      ? item.attributes.series
      : typeof item.attributes.article === 'string'
        ? item.attributes.article
        : item.name;
  const color =
    typeof item.attributes.color === 'string'
      ? item.attributes.color
      : item.attributes.fabricLevel === 'COLOR'
        ? item.name
        : '';
  const article = color || series || item.name;
  return {
    ...line,
    priceItemId: item.id,
    texture,
    series,
    color,
    article,
    unitPrice: String(resolveCeilingsRetailPrice(item)),
  };
}

/** Выбор полотна по каскаду ПрайсП: цена всегда от серии. */
export function applyFabricCascadeSelection(
  line: CeilingsFabricLine,
  opts: {
    texture: string;
    seriesItem: CeilingsPriceItem | null;
    colorItem?: CeilingsPriceItem | null;
  }
): CeilingsFabricLine {
  const { texture, seriesItem, colorItem } = opts;
  if (!seriesItem) {
    return {
      ...line,
      priceItemId: '',
      texture,
      series: '',
      color: '',
      article: '',
      unitPrice: '',
    };
  }
  const series = seriesItem.name;
  const color = colorItem?.name ?? '';
  return {
    ...line,
    priceItemId: seriesItem.id,
    texture,
    series,
    color,
    article: color || series,
    unitPrice: String(resolveCeilingsRetailPrice(seriesItem)),
  };
}

export function applyPriceItemToNamed(
  line: CeilingsNamedQtyLine,
  item: CeilingsPriceItem
): CeilingsNamedQtyLine {
  return {
    ...line,
    priceItemId: item.id,
    name: item.name,
    unit: item.unit || line.unit,
    unitPrice: String(resolveCeilingsRetailPrice(item)),
  };
}

export function applyPriceItemToTape(item: CeilingsPriceItem, qtyM = ''): CeilingsTapeLine {
  const tapeKind = typeof item.attributes.tapeKind === 'string' ? item.attributes.tapeKind : 'mask';
  const color = typeof item.attributes.color === 'string' ? item.attributes.color : item.name;
  return {
    priceItemId: item.id,
    kind: tapeKind,
    color,
    qtyM,
    unitPrice: String(resolveCeilingsRetailPrice(item)),
  };
}
