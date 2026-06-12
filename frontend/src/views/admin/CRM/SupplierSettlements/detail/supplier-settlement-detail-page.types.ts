export interface Supplier {
  id: string;
  legalName: string;
  commercialName?: string | null;
}

export interface SupplierSettlementRow {
  id: string;
  date: string;
  invoice: string | null;
  amount: number | null;
  payment: number | null;
  note: string | null;
}

export type ColumnKey = keyof SupplierSettlementRow | '_index' | '_action';
export type ColumnType = 'date' | 'number' | 'text' | 'index' | 'action';

export type SupplierSettlementColumn = {
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

export interface SettlementSnapshot {
  data: SupplierSettlementRow[];
}
