'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import styles from './CashRegisterPage.module.css';

export interface CashRegisterRow {
  id: string;
  date: string;
  orders: number | null;
  materials: number | null;
  suppliers: number | null;
  salary: number | null;
  other: number | null;
  kp: number | null;
  kr: number | null;
  ap: number | null;
  ar: number | null;
  sp: number | null;
  sr: number | null;
  lk: number | null;
}

const NUMERIC_KEYS: (keyof CashRegisterRow)[] = [
  'orders',
  'materials',
  'suppliers',
  'salary',
  'other',
  'kp',
  'kr',
  'ap',
  'ar',
  'sp',
  'sr',
  'lk',
];

function createEmptyRow(id?: string): CashRegisterRow {
  return {
    id: id ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: '',
    orders: null,
    materials: null,
    suppliers: null,
    salary: null,
    other: null,
    kp: null,
    kr: null,
    ap: null,
    ar: null,
    sp: null,
    sr: null,
    lk: null,
  };
}

function getInitialRows(): CashRegisterRow[] {
  return Array.from({ length: 10 }, () => createEmptyRow());
}

const COLUMNS: {
  key: keyof CashRegisterRow | '_index';
  title: string;
  type: 'date' | 'number' | 'index';
}[] = [
  { key: '_index', title: '№ п/п', type: 'index' },
  { key: 'date', title: 'Дата', type: 'date' },
  { key: 'orders', title: 'Заказы', type: 'number' },
  { key: 'materials', title: 'Материалы', type: 'number' },
  { key: 'suppliers', title: 'Поставщики', type: 'number' },
  { key: 'salary', title: 'З/п', type: 'number' },
  { key: 'other', title: 'Прочее', type: 'number' },
  { key: 'kp', title: 'Кп', type: 'number' },
  { key: 'kr', title: 'Кр', type: 'number' },
  { key: 'ap', title: 'Ап', type: 'number' },
  { key: 'ar', title: 'Ар', type: 'number' },
  { key: 'sp', title: 'Сп', type: 'number' },
  { key: 'sr', title: 'Ср', type: 'number' },
  { key: 'lk', title: 'Лк', type: 'number' },
];

const GREEN_COLUMN_KEYS = new Set<keyof CashRegisterRow>(['kp', 'ap', 'sp', 'lk']);
const RED_COLUMN_KEYS = new Set<keyof CashRegisterRow>(['kr', 'ar', 'sr']);
const SUM_COLUMN_KEYS = new Set<keyof CashRegisterRow>(['kp', 'kr', 'ap', 'ar', 'sp', 'sr', 'lk']);

function formatSum(value: number): string {
  if (value === 0) return '0';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

interface SelectionRange {
  minRow: number;
  minCol: number;
  maxRow: number;
  maxCol: number;
}

export function CashRegisterPage() {
  const [data, setData] = useState<CashRegisterRow[]>(getInitialRows);
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [openingBalanceAlpha, setOpeningBalanceAlpha] = useState<number | null>(null);
  const [openingBalanceSber, setOpeningBalanceSber] = useState<number | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const key of SUM_COLUMN_KEYS) {
      acc[key] = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
    }
    return acc;
  }, [data]);

  const closingBalance = useMemo(() => {
    const kpMinusKr = (totals.kp ?? 0) - (totals.kr ?? 0);
    return (openingBalance ?? 0) + kpMinusKr;
  }, [openingBalance, totals]);

  const closingBalanceAlpha = useMemo(() => {
    const apMinusAr = (totals.ap ?? 0) - (totals.ar ?? 0);
    return (openingBalanceAlpha ?? 0) + apMinusAr;
  }, [openingBalanceAlpha, totals]);

  const closingBalanceSber = useMemo(() => {
    const spMinusSr = (totals.sp ?? 0) - (totals.sr ?? 0);
    return (openingBalanceSber ?? 0) + spMinusSr;
  }, [openingBalanceSber, totals]);

  const totalClosingBalance = useMemo(
    () => closingBalance + closingBalanceAlpha + closingBalanceSber,
    [closingBalance, closingBalanceAlpha, closingBalanceSber]
  );

  const addRow = useCallback(() => {
    setData((prev) => [...prev, createEmptyRow()]);
  }, []);

  const updateCell = useCallback(
    (rowId: string, field: keyof CashRegisterRow, value: string | number) => {
      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          if (field === 'date') {
            return { ...row, date: typeof value === 'string' ? value : '' };
          }
          if (NUMERIC_KEYS.includes(field)) {
            const num = typeof value === 'number' ? value : parseNumeric(String(value));
            return { ...row, [field]: num };
          }
          return row;
        })
      );
    },
    []
  );

  const clearRange = useCallback(
    (minRow: number, minCol: number, maxRow: number, maxCol: number) => {
      const emptyValue = (key: keyof CashRegisterRow) =>
        key === 'date' ? '' : (null as number | null);
      setData((prev) =>
        prev.map((row, ri) => {
          if (ri < minRow || ri > maxRow) return row;
          const updates: Partial<CashRegisterRow> = {};
          for (let ci = minCol; ci <= maxCol; ci++) {
            const key = COLUMNS[ci].key;
            if (key === '_index') continue;
            updates[key] = emptyValue(key);
          }
          return { ...row, ...updates };
        })
      );
    },
    []
  );

  const tableRef = useRef<HTMLTableElement>(null);

  const handleTableClick = useCallback(
    (e: React.MouseEvent<HTMLTableElement>) => {
      const target = (e.target as HTMLElement).closest('td');
      if (!target || !tableRef.current?.contains(target)) return;
      const tr = target.closest('tr');
      if (!tr) return;
      const tbody = tr.parentElement;
      if (!tbody || tbody.tagName !== 'TBODY') return;

      const rowIndex = Array.from(tbody.rows).indexOf(tr as HTMLTableRowElement);
      const colIndex = Array.from(tr.cells).indexOf(target as HTMLTableCellElement);

      if (e.shiftKey && anchor !== null) {
        setSelectionRange({
          minRow: Math.min(anchor.row, rowIndex),
          minCol: Math.min(anchor.col, colIndex),
          maxRow: Math.max(anchor.row, rowIndex),
          maxCol: Math.max(anchor.col, colIndex),
        });
      } else {
        setAnchor({ row: rowIndex, col: colIndex });
        setSelectionRange({
          minRow: rowIndex,
          minCol: colIndex,
          maxRow: rowIndex,
          maxCol: colIndex,
        });
      }
    },
    [anchor]
  );

  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' || !tableRef.current?.contains(target)) return;

      const td = target.closest('td');
      const tr = target.closest('tr');
      if (!td || !tr) return;
      const tbody = tr.parentElement;
      if (!tbody || tbody.tagName !== 'TBODY') return;

      const rowIndex = Array.from(tbody.rows).indexOf(tr as HTMLTableRowElement);
      const colIndex = Array.from(tr.cells).indexOf(td as HTMLTableCellElement);
      const rowCount = tbody.rows.length;
      const colCount = COLUMNS.length;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const minRow = selectionRange?.minRow ?? rowIndex;
        const minCol = selectionRange?.minCol ?? colIndex;
        const maxRow = selectionRange?.maxRow ?? rowIndex;
        const maxCol = selectionRange?.maxCol ?? colIndex;
        clearRange(minRow, minCol, maxRow, maxCol);
        setSelectionRange({ minRow, minCol, maxRow, maxCol });
        setAnchor({ row: minRow, col: minCol });
        const firstInput =
          tbody.rows[minRow]?.cells[minCol]?.querySelector<HTMLInputElement>('input');
        firstInput?.focus();
        return;
      }

      const key = e.key;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') {
        return;
      }

      let nextRow = rowIndex;
      let nextCol = colIndex;
      if (key === 'ArrowLeft') nextCol = Math.max(0, colIndex - 1);
      else if (key === 'ArrowRight') nextCol = Math.min(colCount - 1, colIndex + 1);
      else if (key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1);
      else if (key === 'ArrowDown') nextRow = Math.min(rowCount - 1, rowIndex + 1);

      if (nextRow === rowIndex && nextCol === colIndex) return;

      const nextCell = tbody.rows[nextRow]?.cells[nextCol];
      const nextInput = nextCell?.querySelector<HTMLInputElement>('input');
      if (nextInput) {
        e.preventDefault();
        nextInput.focus();
        setSelectionRange({ minRow: nextRow, minCol: nextCol, maxRow: nextRow, maxCol: nextCol });
        setAnchor({ row: nextRow, col: nextCol });
      }
    },
    [selectionRange, clearRange]
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerGrid}>
          <h1 className={styles.title}>Касса</h1>
          <span className={styles.balanceColHeader}>Начальное сальдо</span>
          <span className={styles.balanceColHeader}>Конечное сальдо</span>
          <span className={styles.balanceColHeader}>Итого</span>
          <span className={styles.rowLabel}>Касса</span>
          <label className={styles.balanceCell} aria-label="Начальное сальдо">
            <input
              type="number"
              className={styles.openingBalanceInput}
              inputMode="decimal"
              step="any"
              value={openingBalance ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                setOpeningBalance(v === '' ? null : Number(v) || null);
              }}
            />
          </label>
          <div className={styles.balanceCell}>
            <span className={styles.closingBalanceValue}>{formatSum(closingBalance)}</span>
          </div>
          <div className={styles.balanceCell}>
            <span className={styles.closingBalanceValue}>{formatSum(totalClosingBalance)}</span>
          </div>
          <span className={styles.rowLabel}>Альфа</span>
          <label className={styles.balanceCell} aria-label="Начальное сальдо Альфа">
            <input
              type="number"
              className={styles.openingBalanceInput}
              inputMode="decimal"
              step="any"
              value={openingBalanceAlpha ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                setOpeningBalanceAlpha(v === '' ? null : Number(v) || null);
              }}
            />
          </label>
          <div className={styles.balanceCell}>
            <span className={styles.closingBalanceValue}>{formatSum(closingBalanceAlpha)}</span>
          </div>
          <span className={styles.totalCellSpacer} aria-hidden />
          <span className={styles.rowLabel}>Сбер</span>
          <label className={styles.balanceCell} aria-label="Начальное сальдо Сбер">
            <input
              type="number"
              className={styles.openingBalanceInput}
              inputMode="decimal"
              step="any"
              value={openingBalanceSber ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                setOpeningBalanceSber(v === '' ? null : Number(v) || null);
              }}
            />
          </label>
          <div className={styles.balanceCell}>
            <span className={styles.closingBalanceValue}>{formatSum(closingBalanceSber)}</span>
          </div>
          <span className={styles.totalCellSpacer} aria-hidden />
        </div>
        <button type="button" className={styles.addRowBtn} onClick={addRow}>
          + Добавить строку
        </button>
      </div>
      <div className={styles.content}>
        <div className={styles.tableWrap}>
          <table
            ref={tableRef}
            className={styles.table}
            onKeyDown={handleTableKeyDown}
            onClick={handleTableClick}
          >
            <thead>
              <tr className={styles.diffRow}>
                {COLUMNS.map((col, idx) => {
                  if (idx === 7) {
                    const diff = (totals.kp ?? 0) - (totals.kr ?? 0);
                    return (
                      <th
                        key="kp-kr-diff"
                        colSpan={2}
                        className={`${styles.th} ${styles.thDiff}`}
                        title="Кп − Кр"
                      >
                        Кп − Кр: {formatSum(diff)}
                      </th>
                    );
                  }
                  if (idx === 9) {
                    const diff = (totals.ap ?? 0) - (totals.ar ?? 0);
                    return (
                      <th
                        key="ap-ar-diff"
                        colSpan={2}
                        className={`${styles.th} ${styles.thDiff}`}
                        title="Ап − Ар"
                      >
                        Ап − Ар: {formatSum(diff)}
                      </th>
                    );
                  }
                  if (idx === 11) {
                    const diff = (totals.sp ?? 0) - (totals.sr ?? 0);
                    return (
                      <th
                        key="sp-sr-diff"
                        colSpan={2}
                        className={`${styles.th} ${styles.thDiff}`}
                        title="Сп − Ср"
                      >
                        Сп − Ср: {formatSum(diff)}
                      </th>
                    );
                  }
                  if (idx === 8 || idx === 10 || idx === 12) return null;
                  return <th key={col.key} className={`${styles.th} ${styles.thDiff}`} />;
                })}
              </tr>
              <tr className={styles.totalsRow}>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={
                      GREEN_COLUMN_KEYS.has(col.key as keyof CashRegisterRow)
                        ? `${styles.th} ${styles.thTotals} ${styles.thGreen}`
                        : RED_COLUMN_KEYS.has(col.key as keyof CashRegisterRow)
                          ? `${styles.th} ${styles.thTotals} ${styles.thRed}`
                          : `${styles.th} ${styles.thTotals}`
                    }
                  >
                    {col.key === '_index'
                      ? ''
                      : col.key === 'date'
                        ? 'Итого'
                        : SUM_COLUMN_KEYS.has(col.key as keyof CashRegisterRow)
                          ? formatSum(totals[col.key] ?? 0)
                          : ''}
                  </th>
                ))}
              </tr>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={
                      GREEN_COLUMN_KEYS.has(col.key as keyof CashRegisterRow)
                        ? `${styles.th} ${styles.thGreen}`
                        : RED_COLUMN_KEYS.has(col.key as keyof CashRegisterRow)
                          ? `${styles.th} ${styles.thRed}`
                          : styles.th
                    }
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={row.id} className={styles.tr}>
                  {COLUMNS.map((col, colIndex) => {
                    const isSelected =
                      selectionRange &&
                      rowIndex >= selectionRange.minRow &&
                      rowIndex <= selectionRange.maxRow &&
                      colIndex >= selectionRange.minCol &&
                      colIndex <= selectionRange.maxCol;
                    return (
                      <td
                        key={col.key}
                        className={[
                          styles.td,
                          col.key !== '_index' &&
                            GREEN_COLUMN_KEYS.has(col.key as keyof CashRegisterRow) &&
                            styles.tdGreen,
                          col.key !== '_index' &&
                            RED_COLUMN_KEYS.has(col.key as keyof CashRegisterRow) &&
                            styles.tdRed,
                          isSelected && styles.tdSelected,
                          col.type === 'index' && styles.tdIndex,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {col.type === 'index' ? (
                          <span className={styles.indexCell}>{rowIndex + 1}</span>
                        ) : col.type === 'date' ? (
                          <input
                            type="date"
                            className={styles.input}
                            value={row.date}
                            onChange={(e) => updateCell(row.id, 'date', e.target.value)}
                            aria-label={col.title}
                          />
                        ) : (
                          <input
                            type="number"
                            className={styles.input}
                            inputMode="decimal"
                            step="any"
                            value={row[col.key as keyof CashRegisterRow] ?? ''}
                            onChange={(e) =>
                              updateCell(
                                row.id,
                                col.key as keyof CashRegisterRow,
                                e.target.value === '' ? '' : e.target.value
                              )
                            }
                            aria-label={col.title}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
