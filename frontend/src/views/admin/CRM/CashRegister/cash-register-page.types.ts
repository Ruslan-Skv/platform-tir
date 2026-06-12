export interface CashRegisterRow {
  id: string;
  date: string;
  orders: string | number | null;
  materials: string | number | null;
  suppliers: string | number | null;
  salary: string | number | null;
  other: string | number | null;
  kp: number | null;
  kr: number | null;
  ap: number | null;
  ar: number | null;
  sp: number | null;
  sr: number | null;
  lk: number | null;
}

export type ColumnKey = keyof CashRegisterRow | '_index' | '_action';
export type ColumnType = 'date' | 'number' | 'text' | 'index' | 'action';

export type CashRegisterColumn = {
  key: ColumnKey;
  title: string;
  type: ColumnType;
};

export interface SelectionRange {
  minRow: number;
  minCol: number;
  maxRow: number;
  maxCol: number;
}

export interface CashRegisterSnapshot {
  data: CashRegisterRow[];
  openingBalance: number | null;
  openingBalanceAlpha: number | null;
  openingBalanceSber: number | null;
}
