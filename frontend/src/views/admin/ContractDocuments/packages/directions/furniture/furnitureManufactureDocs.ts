/** Строки спецификации изготовления мебели (Excel «Спец.»). */
export type FurnitureSpecificationLine = {
  id: string;
  name: string;
  color: string;
  width: string;
  height: string;
  depth: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

/** Строки таблицы материалов (Excel «Табл.»). */
export type FurnitureMaterialLine = {
  id: string;
  name: string;
  articleColor: string;
  unit: string;
  quantity: string;
  supplier: string;
  checked: boolean;
  ordered: boolean;
};

export type FurnitureManufactureDocs = {
  specificationLines: FurnitureSpecificationLine[];
  materialsLines: FurnitureMaterialLine[];
  sketchFileUrl: string;
  sketchFileName: string;
  measurementFileUrl: string;
  measurementFileName: string;
  discountPercent: string;
};

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newFurnitureSpecificationLine(): FurnitureSpecificationLine {
  return {
    id: newId('fs'),
    name: '',
    color: '',
    width: '',
    height: '',
    depth: '',
    quantity: '',
    unitPrice: '',
    lineTotal: '',
  };
}

export function newFurnitureMaterialLine(): FurnitureMaterialLine {
  return {
    id: newId('fm'),
    name: '',
    articleColor: '',
    unit: '',
    quantity: '',
    supplier: '',
    checked: false,
    ordered: false,
  };
}

export function defaultFurnitureManufactureDocs(): FurnitureManufactureDocs {
  return {
    specificationLines: [newFurnitureSpecificationLine()],
    materialsLines: [newFurnitureMaterialLine()],
    sketchFileUrl: '',
    sketchFileName: '',
    measurementFileUrl: '',
    measurementFileName: '',
    discountPercent: '',
  };
}

function asObj(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function parseDecimalInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function formatFurnitureMoney(value: number): string {
  if (!Number.isFinite(value)) return '0,00';
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function resolveFurnitureSpecificationLineTotal(line: FurnitureSpecificationLine): number {
  const qty = parseDecimalInput(line.quantity);
  const price = parseDecimalInput(line.unitPrice);
  if (qty == null || price == null) {
    const explicit = parseDecimalInput(line.lineTotal);
    return explicit ?? 0;
  }
  return Math.round(qty * price * 100) / 100;
}

export function formatFurnitureSpecificationLineTotal(line: FurnitureSpecificationLine): string {
  return formatFurnitureMoney(resolveFurnitureSpecificationLineTotal(line));
}

export function furnitureSpecificationLinesTotal(lines: FurnitureSpecificationLine[]): number {
  return lines.reduce((sum, line) => sum + resolveFurnitureSpecificationLineTotal(line), 0);
}

export function furnitureSpecificationLineHasContent(line: FurnitureSpecificationLine): boolean {
  return Boolean(
    line.name.trim() ||
    line.color.trim() ||
    line.width.trim() ||
    line.height.trim() ||
    line.depth.trim() ||
    line.quantity.trim() ||
    line.unitPrice.trim() ||
    line.lineTotal.trim()
  );
}

function normalizeFurnitureSpecificationLine(raw: unknown): FurnitureSpecificationLine | null {
  const o = asObj(raw);
  if (!o) return null;
  const line: FurnitureSpecificationLine = {
    id: typeof o.id === 'string' && o.id.trim() ? o.id : newId('fs'),
    name: typeof o.name === 'string' ? o.name : '',
    color: typeof o.color === 'string' ? o.color : '',
    width: typeof o.width === 'string' ? o.width : '',
    height: typeof o.height === 'string' ? o.height : '',
    depth: typeof o.depth === 'string' ? o.depth : '',
    quantity: typeof o.quantity === 'string' ? o.quantity : '',
    unitPrice: typeof o.unitPrice === 'string' ? o.unitPrice : '',
    lineTotal: typeof o.lineTotal === 'string' ? o.lineTotal : '',
  };
  return { ...line, lineTotal: formatFurnitureSpecificationLineTotal(line) };
}

function normalizeFurnitureMaterialLine(raw: unknown): FurnitureMaterialLine | null {
  const o = asObj(raw);
  if (!o) return null;
  return {
    id: typeof o.id === 'string' && o.id.trim() ? o.id : newId('fm'),
    name: typeof o.name === 'string' ? o.name : '',
    articleColor: typeof o.articleColor === 'string' ? o.articleColor : '',
    unit: typeof o.unit === 'string' ? o.unit : '',
    quantity: typeof o.quantity === 'string' ? o.quantity : '',
    supplier: typeof o.supplier === 'string' ? o.supplier : '',
    checked: o.checked === true,
    ordered: o.ordered === true,
  };
}

export function normalizeFurnitureSpecificationLines(raw: unknown): FurnitureSpecificationLine[] {
  if (!Array.isArray(raw)) return [newFurnitureSpecificationLine()];
  const out = raw
    .map(normalizeFurnitureSpecificationLine)
    .filter((x): x is FurnitureSpecificationLine => x != null);
  return out.length > 0 ? out : [newFurnitureSpecificationLine()];
}

export function normalizeFurnitureMaterialLines(raw: unknown): FurnitureMaterialLine[] {
  if (!Array.isArray(raw)) return [newFurnitureMaterialLine()];
  const out = raw
    .map(normalizeFurnitureMaterialLine)
    .filter((x): x is FurnitureMaterialLine => x != null);
  return out.length > 0 ? out : [newFurnitureMaterialLine()];
}

export function normalizeFurnitureManufactureDocs(raw: unknown): FurnitureManufactureDocs {
  const base = defaultFurnitureManufactureDocs();
  const o = asObj(raw);
  if (!o) return base;
  return {
    specificationLines: normalizeFurnitureSpecificationLines(o.specificationLines),
    materialsLines: normalizeFurnitureMaterialLines(o.materialsLines),
    sketchFileUrl: typeof o.sketchFileUrl === 'string' ? o.sketchFileUrl : '',
    sketchFileName: typeof o.sketchFileName === 'string' ? o.sketchFileName : '',
    measurementFileUrl: typeof o.measurementFileUrl === 'string' ? o.measurementFileUrl : '',
    measurementFileName: typeof o.measurementFileName === 'string' ? o.measurementFileName : '',
    discountPercent: typeof o.discountPercent === 'string' ? o.discountPercent : '',
  };
}

export function buildFurnitureSpecificationSheetHtml(input: {
  lines: FurnitureSpecificationLine[];
  contractNumber: string;
  contractDate: string;
  discountPercent?: string;
}): string {
  const rows = input.lines.filter(furnitureSpecificationLineHasContent);
  const body =
    rows.length === 0
      ? `<tr><td colspan="8" style="padding:6pt;border:1px solid #94a3b8;">Позиции не заполнены</td></tr>`
      : rows
          .map((line, index) => {
            const total = formatFurnitureSpecificationLineTotal(line);
            return `<tr>
  <td style="padding:4pt;border:1px solid #94a3b8;text-align:center;">${index + 1}</td>
  <td style="padding:4pt;border:1px solid #94a3b8;">${escapeHtml(line.name)}</td>
  <td style="padding:4pt;border:1px solid #94a3b8;">${escapeHtml(line.color)}</td>
  <td style="padding:4pt;border:1px solid #94a3b8;text-align:center;">${escapeHtml(line.width)}</td>
  <td style="padding:4pt;border:1px solid #94a3b8;text-align:center;">${escapeHtml(line.height)}</td>
  <td style="padding:4pt;border:1px solid #94a3b8;text-align:center;">${escapeHtml(line.depth)}</td>
  <td style="padding:4pt;border:1px solid #94a3b8;text-align:center;">${escapeHtml(line.quantity)}</td>
  <td style="padding:4pt;border:1px solid #94a3b8;text-align:right;">${escapeHtml(line.unitPrice)}</td>
  <td style="padding:4pt;border:1px solid #94a3b8;text-align:right;">${escapeHtml(total)}</td>
</tr>`;
          })
          .join('');
  const total = furnitureSpecificationLinesTotal(rows);
  return `
<div class="docPrint">
  <p style="margin:0 0 6pt;">Приложение №1</p>
  <h2 style="text-align:center;font-size:12pt;margin:0 0 10pt;">Спецификация к Договору № ${escapeHtml(input.contractNumber)} от ${escapeHtml(input.contractDate)}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:9pt;table-layout:fixed;">
    <thead>
      <tr>
        <th style="padding:4pt;border:1px solid #94a3b8;width:28px;">№</th>
        <th style="padding:4pt;border:1px solid #94a3b8;">Наименование</th>
        <th style="padding:4pt;border:1px solid #94a3b8;">Цвет</th>
        <th style="padding:4pt;border:1px solid #94a3b8;">Ширина</th>
        <th style="padding:4pt;border:1px solid #94a3b8;">Высота</th>
        <th style="padding:4pt;border:1px solid #94a3b8;">Глубина</th>
        <th style="padding:4pt;border:1px solid #94a3b8;">Кол-во</th>
        <th style="padding:4pt;border:1px solid #94a3b8;">Цена</th>
        <th style="padding:4pt;border:1px solid #94a3b8;">Сумма</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
  <p style="margin:10pt 0 0;text-align:right;"><strong>Итого: ${formatFurnitureMoney(total)} руб.</strong></p>
</div>`.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
