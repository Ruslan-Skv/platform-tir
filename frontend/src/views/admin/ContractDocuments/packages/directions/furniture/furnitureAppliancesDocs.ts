/** Перечень товара техники (Excel «Переч»): бытовая техника + сантехника. */

export type FurnitureAppliancesLineGroup = 'appliances' | 'plumbing';

export type FurnitureAppliancesLine = {
  id: string;
  name: string;
  color: string;
  unitPrice: string;
  quantity: string;
  lineTotal: string;
  group: FurnitureAppliancesLineGroup;
};

export type FurnitureAppliancesDocs = {
  lines: FurnitureAppliancesLine[];
};

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseDecimalInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function formatFurnitureAppliancesMoney(value: number): string {
  if (!Number.isFinite(value)) return '0,00';
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function resolveFurnitureAppliancesLineTotal(line: {
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}): number {
  const qty = parseDecimalInput(line.quantity);
  const price = parseDecimalInput(line.unitPrice);
  if (qty == null || price == null) {
    return parseDecimalInput(line.lineTotal) ?? 0;
  }
  return Math.round(qty * price * 100) / 100;
}

export function formatFurnitureAppliancesLineTotal(line: {
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}): string {
  return formatFurnitureAppliancesMoney(resolveFurnitureAppliancesLineTotal(line));
}

export function furnitureAppliancesLinesTotal(
  lines: FurnitureAppliancesLine[],
  group?: FurnitureAppliancesLineGroup
): number {
  return lines.reduce((sum, line) => {
    if (group && line.group !== group) return sum;
    return sum + resolveFurnitureAppliancesLineTotal(line);
  }, 0);
}

/** Стартовый каталог как в Excel «Переч». */
export const DEFAULT_FURNITURE_APPLIANCES_CATALOG: Omit<FurnitureAppliancesLine, 'id'>[] = [
  {
    name: 'Вытяжка 500 камилла',
    color: '',
    unitPrice: '7400',
    quantity: '1',
    lineTotal: '',
    group: 'appliances',
  },
  {
    name: '',
    color: '',
    unitPrice: '',
    quantity: '',
    lineTotal: '',
    group: 'appliances',
  },
  {
    name: '',
    color: '',
    unitPrice: '',
    quantity: '',
    lineTotal: '',
    group: 'plumbing',
  },
  {
    name: '',
    color: '',
    unitPrice: '',
    quantity: '',
    lineTotal: '',
    group: 'plumbing',
  },
];

export function newFurnitureAppliancesLine(
  partial?: Partial<FurnitureAppliancesLine>
): FurnitureAppliancesLine {
  const base: FurnitureAppliancesLine = {
    id: newId('fat'),
    name: '',
    color: '',
    unitPrice: '',
    quantity: '',
    lineTotal: '',
    group: 'appliances',
    ...partial,
  };
  return { ...base, lineTotal: formatFurnitureAppliancesLineTotal(base) };
}

export function defaultFurnitureAppliancesDocs(): FurnitureAppliancesDocs {
  return {
    lines: DEFAULT_FURNITURE_APPLIANCES_CATALOG.map((row) => newFurnitureAppliancesLine(row)),
  };
}

function asObj(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function normalizeAppliancesLine(raw: unknown): FurnitureAppliancesLine | null {
  const o = asObj(raw);
  if (!o) return null;
  const group: FurnitureAppliancesLineGroup = o.group === 'plumbing' ? 'plumbing' : 'appliances';
  const line: FurnitureAppliancesLine = {
    id: typeof o.id === 'string' && o.id.trim() ? o.id : newId('fat'),
    name: typeof o.name === 'string' ? o.name : '',
    color: typeof o.color === 'string' ? o.color : '',
    unitPrice: typeof o.unitPrice === 'string' ? o.unitPrice : '',
    quantity: typeof o.quantity === 'string' ? o.quantity : '',
    lineTotal: typeof o.lineTotal === 'string' ? o.lineTotal : '',
    group,
  };
  return { ...line, lineTotal: formatFurnitureAppliancesLineTotal(line) };
}

export function normalizeFurnitureAppliancesDocs(raw: unknown): FurnitureAppliancesDocs {
  const base = defaultFurnitureAppliancesDocs();
  const o = asObj(raw);
  if (!o) return base;
  const lines = Array.isArray(o.lines)
    ? o.lines.map(normalizeAppliancesLine).filter((x): x is FurnitureAppliancesLine => x != null)
    : base.lines;
  return { lines: lines.length > 0 ? lines : base.lines };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Печатный HTML перечня товара (для шаринга заказчику). */
export function buildFurnitureAppliancesSheetHtml(
  docs: FurnitureAppliancesDocs,
  options?: { contractNumber?: string; contractDate?: string }
): string {
  const renderGroup = (group: FurnitureAppliancesLineGroup, title: string) => {
    const lines = docs.lines.filter((l) => l.group === group);
    const rows = lines
      .map((line, i) => {
        const total = resolveFurnitureAppliancesLineTotal(line);
        if (!line.name.trim() && total <= 0) return '';
        return `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(line.name)}</td>
          <td>${escapeHtml(line.color)}</td>
          <td style="text-align:right">${escapeHtml(line.unitPrice)}</td>
          <td style="text-align:right">${escapeHtml(line.quantity)}</td>
          <td style="text-align:right">${formatFurnitureAppliancesMoney(total)}</td>
        </tr>`;
      })
      .filter(Boolean)
      .join('');
    const sum = furnitureAppliancesLinesTotal(lines, group);
    return `<h3 style="margin:14pt 0 6pt;font-size:12pt">${title}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10pt">
        <thead><tr>
          <th style="border:1px solid #333;padding:4pt">№</th>
          <th style="border:1px solid #333;padding:4pt">Наименование</th>
          <th style="border:1px solid #333;padding:4pt">Цвет</th>
          <th style="border:1px solid #333;padding:4pt">Цена</th>
          <th style="border:1px solid #333;padding:4pt">Кол-во</th>
          <th style="border:1px solid #333;padding:4pt">Стоимость</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="border:1px solid #333;padding:4pt">—</td></tr>'}</tbody>
      </table>
      <p style="text-align:right;margin:6pt 0 0;font-weight:600">Всего: ${formatFurnitureAppliancesMoney(sum)} руб.</p>`;
  };

  const number = options?.contractNumber?.trim() ?? '';
  const date = options?.contractDate?.trim() ?? '';
  const grand = furnitureAppliancesLinesTotal(docs.lines);
  return `<div class="docPrint">
    <p style="margin:0 0 4pt">Приложение 1</p>
    <h1 style="text-align:center;font-size:13pt;margin:0 0 8pt">ПЕРЕЧЕНЬ ТОВАРА</h1>
    <p style="text-align:center;margin:0 0 12pt">К договору № ${escapeHtml(number)} от ${escapeHtml(date)}</p>
    ${renderGroup('appliances', 'Бытовая техника')}
    ${renderGroup('plumbing', 'Сантехника')}
    <p style="text-align:right;margin:14pt 0 0;font-weight:700;font-size:12pt">
      Итого стоимость: ${formatFurnitureAppliancesMoney(grand)} руб.
    </p>
  </div>`;
}
