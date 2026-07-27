/** Видимость колонок списка договоров (/admin/contract-documents/contracts). */

export type ContractsListColumnKey =
  | 'kind'
  | 'contractNumber'
  | 'date'
  | 'status'
  | 'customer'
  | 'manager'
  | 'address'
  | 'workDescription'
  | 'contractTotal'
  | 'addenda'
  | 'paid'
  | 'remaining'
  | 'workStartAct'
  | 'closeAct';

export type ContractsListColumnDef = {
  key: ContractsListColumnKey;
  title: string;
  /** Нельзя снять — номер договора всегда в таблице. */
  locked?: boolean;
};

/** Колонки, которыми управляет «Колонки» (порядок = порядок в таблице). */
export const CONTRACTS_LIST_COLUMN_DEFS: ContractsListColumnDef[] = [
  { key: 'kind', title: 'Направление' },
  { key: 'contractNumber', title: '№ договора', locked: true },
  { key: 'date', title: 'Дата' },
  { key: 'status', title: 'Статус' },
  { key: 'customer', title: 'Заказчик' },
  { key: 'manager', title: 'Ответственный' },
  { key: 'address', title: 'Адрес объекта' },
  { key: 'workDescription', title: 'Описание работ' },
  { key: 'contractTotal', title: 'СД нач.' },
  { key: 'addenda', title: 'Д/с и СД итог.' },
  { key: 'paid', title: 'Оплачено' },
  { key: 'remaining', title: 'Остаток' },
  { key: 'workStartAct', title: 'Акт нр' },
  { key: 'closeAct', title: 'Акт с/п' },
];

const ALL_KEYS = CONTRACTS_LIST_COLUMN_DEFS.map((d) => d.key);
const LOCKED_KEYS = new Set(CONTRACTS_LIST_COLUMN_DEFS.filter((d) => d.locked).map((d) => d.key));

/** Компактный дефолт: без описания, сумм Д/с и дат актов. */
export const CONTRACTS_LIST_DEFAULT_VISIBLE_COLUMNS: ContractsListColumnKey[] = [
  'kind',
  'contractNumber',
  'date',
  'status',
  'customer',
  'manager',
  'address',
  'remaining',
];

const STORAGE_KEY = 'admin_contracts_list_columns_v1';

function normalizeVisibleColumns(raw: unknown): ContractsListColumnKey[] {
  if (!Array.isArray(raw)) return [...CONTRACTS_LIST_DEFAULT_VISIBLE_COLUMNS];
  const allowed = new Set<string>(ALL_KEYS);
  const next = raw.filter(
    (k): k is ContractsListColumnKey => typeof k === 'string' && allowed.has(k)
  );
  for (const locked of LOCKED_KEYS) {
    if (!next.includes(locked)) next.unshift(locked);
  }
  return next.length > 0 ? next : [...CONTRACTS_LIST_DEFAULT_VISIBLE_COLUMNS];
}

export function loadContractsListVisibleColumns(): ContractsListColumnKey[] {
  if (typeof window === 'undefined') return [...CONTRACTS_LIST_DEFAULT_VISIBLE_COLUMNS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...CONTRACTS_LIST_DEFAULT_VISIBLE_COLUMNS];
    return normalizeVisibleColumns(JSON.parse(raw));
  } catch {
    return [...CONTRACTS_LIST_DEFAULT_VISIBLE_COLUMNS];
  }
}

export function persistContractsListVisibleColumns(columns: ContractsListColumnKey[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeVisibleColumns(columns)));
  } catch {
    /* ignore */
  }
}

export function isContractsListColumnLocked(key: ContractsListColumnKey): boolean {
  return LOCKED_KEYS.has(key);
}

export function isContractsListColumnVisible(
  visible: readonly ContractsListColumnKey[],
  key: ContractsListColumnKey
): boolean {
  return visible.includes(key);
}

/** Число `<td>` / `<th>` в строке пакета (включая select и actions). */
export function countContractsListTableColSpan(
  visible: readonly ContractsListColumnKey[],
  addendumColumnCount: number
): number {
  let n = 2; // select + actions
  for (const key of ALL_KEYS) {
    if (!visible.includes(key)) continue;
    if (key === 'addenda') {
      if (addendumColumnCount > 0) n += addendumColumnCount + 1;
      continue;
    }
    n += 1;
  }
  return n;
}

export function toggleContractsListVisibleColumn(
  current: readonly ContractsListColumnKey[],
  key: ContractsListColumnKey
): ContractsListColumnKey[] {
  if (LOCKED_KEYS.has(key)) return [...current];
  if (current.includes(key)) {
    return current.filter((k) => k !== key);
  }
  // Вставляем в каноническом порядке таблицы
  const next = new Set(current);
  next.add(key);
  return ALL_KEYS.filter((k) => next.has(k));
}
