/** Счёт-заказ монтажа (Excel «С-З») и строки заказ-наряда. */

export type FurnitureMontageLine = {
  id: string;
  name: string;
  unitPrice: string;
  quantity: string;
  lineTotal: string;
  /** Группа: основная сборка / доп. работы / камень / прочее. */
  group: 'assembly' | 'extra' | 'stone' | 'custom';
};

export type FurnitureWorkOrderManufactureLine = {
  id: string;
  name: string;
  unitPrice: string;
  quantity: string;
  lineTotal: string;
};

export type FurnitureMontageDocs = {
  /** Позиции счёт-заказа монтажа. */
  estimateLines: FurnitureMontageLine[];
  /** Строки блока «Изготовление» в заказ-наряде (З-Н). */
  workOrderManufactureLines: FurnitureWorkOrderManufactureLine[];
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

export function formatFurnitureMontageMoney(value: number): string {
  if (!Number.isFinite(value)) return '0,00';
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function resolveFurnitureMontageLineTotal(line: {
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

export function formatFurnitureMontageLineTotal(line: {
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}): string {
  return formatFurnitureMontageMoney(resolveFurnitureMontageLineTotal(line));
}

export function furnitureMontageLinesTotal(lines: FurnitureMontageLine[]): number {
  return lines.reduce((sum, line) => sum + resolveFurnitureMontageLineTotal(line), 0);
}

/** Базовый каталог позиций счёт-заказа (как в Excel «С-З»). */
export const DEFAULT_FURNITURE_MONTAGE_ESTIMATE_CATALOG: Omit<FurnitureMontageLine, 'id'>[] = [
  { name: 'Сборка мебели', unitPrice: '0', quantity: '1', lineTotal: '', group: 'assembly' },
  {
    name: 'Вырез под мойку (варочную панель), шт.',
    unitPrice: '750',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Установка посудомоечной машины (без подключения к коммуникациям), шт',
    unitPrice: '500',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Установка вытяжки и подключение, шт',
    unitPrice: '1250',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Установка встраиваемого холодильника, шт',
    unitPrice: '1250',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Установка точечного светильника, шт',
    unitPrice: '260',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Установка светодиодной ленты и подключение, шт',
    unitPrice: '1300',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Установка духового шкафа (без подключения), шт',
    unitPrice: '500',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Установка встраиваемой СВЧ (без подключения), шт',
    unitPrice: '500',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Установка ручек заказчика, шт.',
    unitPrice: '80',
    quantity: '0',
    lineTotal: '',
    group: 'extra',
  },
  {
    name: 'Вырез под мойку (варочную панель) в камне, шт.',
    unitPrice: '2000',
    quantity: '0',
    lineTotal: '',
    group: 'stone',
  },
  {
    name: 'Монтаж мойки нижнего крепежа в камне, шт.',
    unitPrice: '5000',
    quantity: '0',
    lineTotal: '',
    group: 'stone',
  },
];

export const DEFAULT_FURNITURE_WORK_ORDER_MANUFACTURE_CATALOG: Omit<
  FurnitureWorkOrderManufactureLine,
  'id'
>[] = [
  { name: 'Изготовление', unitPrice: '0', quantity: '1', lineTotal: '' },
  { name: 'Еврозапил столешницы', unitPrice: '1500', quantity: '0', lineTotal: '' },
  { name: 'Скругление, сложнокрой', unitPrice: '200', quantity: '0', lineTotal: '' },
  { name: 'Фрезеровка ручка «улыбка»', unitPrice: '200', quantity: '0', lineTotal: '' },
  { name: 'Фрезеровка под врезную ручку', unitPrice: '200', quantity: '0', lineTotal: '' },
  { name: 'Сборка фасада в алюм. рамки', unitPrice: '950', quantity: '0', lineTotal: '' },
  { name: 'Фасады', unitPrice: '100', quantity: '0', lineTotal: '' },
  { name: 'Комплект фурнитуры', unitPrice: '0', quantity: '0', lineTotal: '' },
];

export function newFurnitureMontageLine(
  partial?: Partial<FurnitureMontageLine>
): FurnitureMontageLine {
  const base: FurnitureMontageLine = {
    id: newId('fme'),
    name: '',
    unitPrice: '',
    quantity: '',
    lineTotal: '',
    group: 'custom',
    ...partial,
  };
  return { ...base, lineTotal: formatFurnitureMontageLineTotal(base) };
}

export function newFurnitureWorkOrderManufactureLine(
  partial?: Partial<FurnitureWorkOrderManufactureLine>
): FurnitureWorkOrderManufactureLine {
  const base: FurnitureWorkOrderManufactureLine = {
    id: newId('fwm'),
    name: '',
    unitPrice: '',
    quantity: '',
    lineTotal: '',
    ...partial,
  };
  return { ...base, lineTotal: formatFurnitureMontageLineTotal(base) };
}

export function defaultFurnitureMontageDocs(): FurnitureMontageDocs {
  return {
    estimateLines: DEFAULT_FURNITURE_MONTAGE_ESTIMATE_CATALOG.map((row) =>
      newFurnitureMontageLine(row)
    ),
    workOrderManufactureLines: DEFAULT_FURNITURE_WORK_ORDER_MANUFACTURE_CATALOG.map((row) =>
      newFurnitureWorkOrderManufactureLine(row)
    ),
  };
}

function asObj(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function normalizeMontageLine(raw: unknown): FurnitureMontageLine | null {
  const o = asObj(raw);
  if (!o) return null;
  const groupRaw = o.group;
  const group =
    groupRaw === 'assembly' || groupRaw === 'extra' || groupRaw === 'stone' || groupRaw === 'custom'
      ? groupRaw
      : 'custom';
  const line: FurnitureMontageLine = {
    id: typeof o.id === 'string' && o.id.trim() ? o.id : newId('fme'),
    name: typeof o.name === 'string' ? o.name : '',
    unitPrice: typeof o.unitPrice === 'string' ? o.unitPrice : '',
    quantity: typeof o.quantity === 'string' ? o.quantity : '',
    lineTotal: typeof o.lineTotal === 'string' ? o.lineTotal : '',
    group,
  };
  return { ...line, lineTotal: formatFurnitureMontageLineTotal(line) };
}

function normalizeWorkOrderManufactureLine(raw: unknown): FurnitureWorkOrderManufactureLine | null {
  const o = asObj(raw);
  if (!o) return null;
  const line: FurnitureWorkOrderManufactureLine = {
    id: typeof o.id === 'string' && o.id.trim() ? o.id : newId('fwm'),
    name: typeof o.name === 'string' ? o.name : '',
    unitPrice: typeof o.unitPrice === 'string' ? o.unitPrice : '',
    quantity: typeof o.quantity === 'string' ? o.quantity : '',
    lineTotal: typeof o.lineTotal === 'string' ? o.lineTotal : '',
  };
  return { ...line, lineTotal: formatFurnitureMontageLineTotal(line) };
}

export function normalizeFurnitureMontageDocs(raw: unknown): FurnitureMontageDocs {
  const base = defaultFurnitureMontageDocs();
  const o = asObj(raw);
  if (!o) return base;
  const estimateLines = Array.isArray(o.estimateLines)
    ? o.estimateLines.map(normalizeMontageLine).filter((x): x is FurnitureMontageLine => x != null)
    : base.estimateLines;
  const workOrderManufactureLines = Array.isArray(o.workOrderManufactureLines)
    ? o.workOrderManufactureLines
        .map(normalizeWorkOrderManufactureLine)
        .filter((x): x is FurnitureWorkOrderManufactureLine => x != null)
    : base.workOrderManufactureLines;
  return {
    estimateLines: estimateLines.length > 0 ? estimateLines : base.estimateLines,
    workOrderManufactureLines:
      workOrderManufactureLines.length > 0
        ? workOrderManufactureLines
        : base.workOrderManufactureLines,
  };
}
