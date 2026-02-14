'use client';

import { Trash2, Undo2 } from 'lucide-react';

import { useCallback, useMemo, useRef, useState } from 'react';

import styles from './CashRegisterPage.module.css';

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

const TEXT_COLUMN_KEYS = new Set<keyof CashRegisterRow>([
  'orders',
  'materials',
  'suppliers',
  'salary',
  'other',
]);
const NUMERIC_KEYS: (keyof CashRegisterRow)[] = ['kp', 'kr', 'ap', 'ar', 'sp', 'sr', 'lk'];

function createEmptyRow(id?: string): CashRegisterRow {
  return {
    id: id ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: '',
    orders: '',
    materials: '',
    suppliers: '',
    salary: '',
    other: '',
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

type ColumnKey = keyof CashRegisterRow | '_index' | '_action';
type ColumnType = 'date' | 'number' | 'text' | 'index' | 'action';

const COLUMNS: {
  key: ColumnKey;
  title: string;
  type: ColumnType;
}[] = [
  { key: '_index', title: '№ п/п', type: 'index' },
  { key: 'date', title: 'Дата', type: 'date' },
  { key: 'orders', title: '№ договора', type: 'text' },
  { key: 'materials', title: 'Тип операции', type: 'text' },
  { key: 'salary', title: 'ФИО', type: 'text' },
  { key: 'suppliers', title: 'Поставщики', type: 'text' },
  { key: 'other', title: 'Прочее', type: 'text' },
  { key: 'kp', title: 'Кп', type: 'number' },
  { key: 'kr', title: 'Кр', type: 'number' },
  { key: 'ap', title: 'Ап', type: 'number' },
  { key: 'ar', title: 'Ар', type: 'number' },
  { key: 'sp', title: 'Сп', type: 'number' },
  { key: 'sr', title: 'Ср', type: 'number' },
  { key: 'lk', title: 'Лк', type: 'number' },
  { key: '_action', title: '', type: 'action' },
];

const GREEN_COLUMN_KEYS = new Set<keyof CashRegisterRow>(['kp', 'ap', 'sp', 'lk']);
const RED_COLUMN_KEYS = new Set<keyof CashRegisterRow>(['kr', 'ar', 'sr']);
const SUM_COLUMN_KEYS = new Set<keyof CashRegisterRow>(['kp', 'kr', 'ap', 'ar', 'sp', 'sr', 'lk']);

const DEFAULT_COLUMN_WIDTHS = [36, 110, 70, 90, 55, 90, 55, 55, 55, 55, 55, 55, 55, 55, 36];
const MIN_COL_WIDTH = 28;
const MAX_COL_WIDTH = 400;

const COL_WIDTH_STORAGE_KEY = 'cash-register-column-widths';
const VISIBLE_ROWS_STORAGE_KEY = 'cash-register-visible-rows';
const VISIBLE_ROW_OPTIONS = [15, 20, 25, 30, 35] as const;
const ROW_HEIGHT = 27;
const HEADER_ROW_HEIGHT = 22;
const HEADER_ROWS_COUNT = 3;

function loadColumnWidths(): number[] {
  if (typeof window === 'undefined') return [...DEFAULT_COLUMN_WIDTHS];
  try {
    const s = window.localStorage.getItem(COL_WIDTH_STORAGE_KEY);
    if (!s) return [...DEFAULT_COLUMN_WIDTHS];
    const parsed = JSON.parse(s) as number[];
    if (Array.isArray(parsed) && parsed.length === COLUMNS.length) {
      return parsed.map((w) => Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, w)));
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_COLUMN_WIDTHS];
}

function saveColumnWidths(widths: number[]) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COL_WIDTH_STORAGE_KEY, JSON.stringify(widths));
  }
}

function loadVisibleRowCount(): (typeof VISIBLE_ROW_OPTIONS)[number] {
  if (typeof window === 'undefined') return 20;
  try {
    const s = window.localStorage.getItem(VISIBLE_ROWS_STORAGE_KEY);
    if (s) {
      const n = Number(s);
      if (VISIBLE_ROW_OPTIONS.includes(n as (typeof VISIBLE_ROW_OPTIONS)[number])) {
        return n as (typeof VISIBLE_ROW_OPTIONS)[number];
      }
    }
  } catch {
    /* ignore */
  }
  return 20;
}

function saveVisibleRowCount(count: number) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VISIBLE_ROWS_STORAGE_KEY, String(count));
  }
}

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

const UNDO_MAX_STEPS = 20;

interface CashRegisterSnapshot {
  data: CashRegisterRow[];
  openingBalance: number | null;
  openingBalanceAlpha: number | null;
  openingBalanceSber: number | null;
}

export function CashRegisterPage() {
  const [data, setData] = useState<CashRegisterRow[]>(getInitialRows);
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [openingBalanceAlpha, setOpeningBalanceAlpha] = useState<number | null>(null);
  const [openingBalanceSber, setOpeningBalanceSber] = useState<number | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>(loadColumnWidths);
  const [visibleRowCount, setVisibleRowCount] = useState(loadVisibleRowCount);
  const [history, setHistory] = useState<CashRegisterSnapshot[]>([]);
  const isUndoRef = useRef(false);
  const resizeRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  const tableResizeRef = useRef<{
    startX: number;
    startTotal: number;
    startLastCol: number;
    restSum: number;
  } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleColumnResizeStart = useCallback(
    (colIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = columnWidths[colIndex];
      resizeRef.current = { colIndex, startX, startWidth };

      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, startWidth + delta));
        setColumnWidths((prev) => {
          const next = [...prev];
          next[colIndex] = newWidth;
          return next;
        });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setColumnWidths((prev) => {
          saveColumnWidths(prev);
          return prev;
        });
        resizeRef.current = null;
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [columnWidths]
  );

  const handleTableResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startTotal = columnWidths.reduce((a, b) => a + b, 0);
      const restSum = columnWidths.slice(0, -1).reduce((a, b) => a + b, 0);
      const startLastCol = columnWidths[columnWidths.length - 1] ?? 0;
      tableResizeRef.current = { startX: e.clientX, startTotal, startLastCol, restSum };
      const onMove = (moveEvent: MouseEvent) => {
        const ref = tableResizeRef.current;
        if (!ref) return;
        const delta = moveEvent.clientX - ref.startX;
        const newLastCol = Math.max(MIN_COL_WIDTH, ref.startLastCol + delta);
        setColumnWidths((prev) => {
          const next = [...prev];
          next[next.length - 1] = newLastCol;
          return next;
        });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setColumnWidths((prev) => {
          saveColumnWidths(prev);
          return prev;
        });
        tableResizeRef.current = null;
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [columnWidths]
  );

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    // Используем Array.from для итерации Set
    Array.from(SUM_COLUMN_KEYS).forEach((key) => {
      acc[key] = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
    });
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

  const pushHistory = useCallback(() => {
    if (isUndoRef.current) return;
    setHistory((prev) => {
      const snap: CashRegisterSnapshot = {
        data: data.map((r) => ({ ...r })),
        openingBalance,
        openingBalanceAlpha,
        openingBalanceSber,
      };
      const next = [...prev, snap].slice(-UNDO_MAX_STEPS);
      return next;
    });
  }, [data, openingBalance, openingBalanceAlpha, openingBalanceSber]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const snap = next.pop()!;
      isUndoRef.current = true;
      setData(snap.data.map((r) => ({ ...r })));
      setOpeningBalance(snap.openingBalance);
      setOpeningBalanceAlpha(snap.openingBalanceAlpha);
      setOpeningBalanceSber(snap.openingBalanceSber);
      setSelectionRange(null);
      setAnchor(null);
      setTimeout(() => {
        isUndoRef.current = false;
      }, 0);
      return next;
    });
  }, []);

  const addRow = useCallback(() => {
    pushHistory();
    setData((prev) => [...prev, createEmptyRow()]);
  }, [pushHistory]);

  const deleteRow = useCallback(
    (rowId: string) => {
      pushHistory();
      setData((prev) => prev.filter((row) => row.id !== rowId));
      setSelectionRange(null);
      setAnchor(null);
    },
    [pushHistory]
  );

  const updateCell = useCallback(
    (rowId: string, field: keyof CashRegisterRow, value: string | number) => {
      pushHistory();
      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          if (field === 'date') {
            return { ...row, date: typeof value === 'string' ? value : '' };
          }
          if (TEXT_COLUMN_KEYS.has(field)) {
            return { ...row, [field]: value === '' || value === null ? '' : String(value) };
          }
          if (NUMERIC_KEYS.includes(field)) {
            const num = typeof value === 'number' ? value : parseNumeric(String(value));
            return { ...row, [field]: num };
          }
          return row;
        })
      );
    },
    [pushHistory]
  );

  const clearRange = useCallback(
    (minRow: number, minCol: number, maxRow: number, maxCol: number) => {
      pushHistory();
      setData((prev) =>
        prev.map((row, ri) => {
          if (ri < minRow || ri > maxRow) return row;
          const updates: Partial<CashRegisterRow> = {};
          for (let ci = minCol; ci <= maxCol; ci++) {
            const key = COLUMNS[ci].key;
            if (key === '_index' || key === '_action') continue;
            // Используем type assertion для безопасного присвоения
            if (key === 'date' || TEXT_COLUMN_KEYS.has(key as keyof CashRegisterRow)) {
              (updates as Record<string, unknown>)[key] = '';
            } else {
              (updates as Record<string, unknown>)[key] = null;
            }
          }
          return { ...row, ...updates };
        })
      );
    },
    [pushHistory]
  );

  const handleTableClick = useCallback(
    (e: React.MouseEvent<HTMLTableElement>) => {
      const target = (e.target as HTMLElement).closest('td');
      if (!target || !tableRef.current?.contains(target)) return;
      const tr = target.closest('tr');
      if (!tr) return;
      const tbody = tr.parentElement;
      if (!tbody || tbody.tagName !== 'TBODY') return;

      // Приводим к правильному типу
      const tbodyElement = tbody as HTMLTableSectionElement;
      const rowIndex = Array.from(tbodyElement.rows).indexOf(tr as HTMLTableRowElement);
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

      // Приводим к правильному типу
      const tbodyElement = tbody as HTMLTableSectionElement;
      const rowIndex = Array.from(tbodyElement.rows).indexOf(tr as HTMLTableRowElement);
      const colIndex = Array.from(tr.cells).indexOf(td as HTMLTableCellElement);
      const rowCount = tbodyElement.rows.length;
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
          tbodyElement.rows[minRow]?.cells[minCol]?.querySelector<HTMLInputElement>('input');
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

      const nextCell = tbodyElement.rows[nextRow]?.cells[nextCol];
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
                pushHistory();
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
                pushHistory();
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
                pushHistory();
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
        <div className={styles.headerActions}>
          <label className={styles.visibleRowsLabel}>
            Строк на экране:
            <select
              className={styles.visibleRowsSelect}
              value={visibleRowCount}
              onChange={(e) => {
                const v = Number(e.target.value) as (typeof VISIBLE_ROW_OPTIONS)[number];
                setVisibleRowCount(v);
                saveVisibleRowCount(v);
              }}
            >
              {VISIBLE_ROW_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.undoBtn}
            onClick={undo}
            disabled={history.length === 0}
            title={`Отменить (осталось ${history.length} из ${UNDO_MAX_STEPS})`}
          >
            <Undo2 size={18} />
            Отменить
          </button>
          <button type="button" className={styles.addRowBtn} onClick={addRow}>
            + Добавить строку
          </button>
        </div>
      </div>
      <div className={styles.content}>
        <div
          className={styles.tableWrap}
          style={{
            maxHeight: HEADER_ROWS_COUNT * HEADER_ROW_HEIGHT + visibleRowCount * ROW_HEIGHT,
          }}
        >
          <div
            className={styles.tableResizeContainer}
            style={{ width: columnWidths.reduce((a, b) => a + b, 0) }}
          >
            <table
              ref={tableRef}
              className={styles.table}
              style={{ tableLayout: 'fixed' }}
              onKeyDown={handleTableKeyDown}
              onClick={handleTableClick}
            >
              <colgroup>
                {COLUMNS.map((col, i) => (
                  <col key={col.key} style={{ width: columnWidths[i] }} />
                ))}
              </colgroup>
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
                    if (col.key === '_action')
                      return <th key="_action" className={`${styles.th} ${styles.thDiff}`} />;
                    return <th key={col.key} className={`${styles.th} ${styles.thDiff}`} />;
                  })}
                </tr>
                <tr className={styles.totalsRow}>
                  {COLUMNS.map((col) => {
                    const isGreen =
                      col.key !== '_index' &&
                      col.key !== '_action' &&
                      GREEN_COLUMN_KEYS.has(col.key as keyof CashRegisterRow);
                    const isRed =
                      col.key !== '_index' &&
                      col.key !== '_action' &&
                      RED_COLUMN_KEYS.has(col.key as keyof CashRegisterRow);

                    return (
                      <th
                        key={col.key}
                        className={
                          isGreen
                            ? `${styles.th} ${styles.thTotals} ${styles.thGreen}`
                            : isRed
                              ? `${styles.th} ${styles.thTotals} ${styles.thRed}`
                              : `${styles.th} ${styles.thTotals}`
                        }
                      >
                        {col.key === '_index'
                          ? ''
                          : col.key === 'date'
                            ? 'Итого'
                            : col.key !== '_action' &&
                                SUM_COLUMN_KEYS.has(col.key as keyof CashRegisterRow)
                              ? formatSum(totals[col.key] ?? 0)
                              : ''}
                      </th>
                    );
                  })}
                </tr>
                <tr className={styles.headerRow}>
                  {COLUMNS.map((col, colIndex) => {
                    const isGreen =
                      col.key !== '_index' &&
                      col.key !== '_action' &&
                      GREEN_COLUMN_KEYS.has(col.key as keyof CashRegisterRow);
                    const isRed =
                      col.key !== '_index' &&
                      col.key !== '_action' &&
                      RED_COLUMN_KEYS.has(col.key as keyof CashRegisterRow);

                    return (
                      <th
                        key={col.key}
                        className={
                          col.key === '_action'
                            ? styles.th
                            : isGreen
                              ? `${styles.th} ${styles.thGreen} ${styles.thResizable}`
                              : isRed
                                ? `${styles.th} ${styles.thRed} ${styles.thResizable}`
                                : `${styles.th} ${styles.thResizable}`
                        }
                      >
                        {col.title}
                        {col.key !== '_action' && (
                          <span
                            className={styles.resizeHandle}
                            onMouseDown={(e) => handleColumnResizeStart(colIndex, e)}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={`Изменить ширину колонки ${col.title}`}
                          />
                        )}
                      </th>
                    );
                  })}
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

                      const isGreen =
                        col.key !== '_index' &&
                        col.key !== '_action' &&
                        GREEN_COLUMN_KEYS.has(col.key as keyof CashRegisterRow);
                      const isRed =
                        col.key !== '_index' &&
                        col.key !== '_action' &&
                        RED_COLUMN_KEYS.has(col.key as keyof CashRegisterRow);

                      return (
                        <td
                          key={col.key}
                          className={[
                            styles.td,
                            isGreen && styles.tdGreen,
                            isRed && styles.tdRed,
                            isSelected && styles.tdSelected,
                            col.type === 'index' && styles.tdIndex,
                            col.type === 'action' && styles.tdAction,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {col.type === 'index' ? (
                            <span className={styles.indexCell}>{rowIndex + 1}</span>
                          ) : col.type === 'action' ? (
                            <button
                              type="button"
                              className={styles.deleteRowBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRow(row.id);
                              }}
                              title="Удалить строку"
                              aria-label="Удалить строку"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : col.type === 'date' ? (
                            <input
                              type="date"
                              className={styles.input}
                              value={row.date}
                              onChange={(e) => updateCell(row.id, 'date', e.target.value)}
                              aria-label={col.title}
                            />
                          ) : col.type === 'text' ? (
                            <input
                              type="text"
                              className={styles.input}
                              value={String(row[col.key as keyof CashRegisterRow] ?? '')}
                              onChange={(e) =>
                                updateCell(row.id, col.key as keyof CashRegisterRow, e.target.value)
                              }
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
            <div
              className={styles.tableResizeHandle}
              onMouseDown={handleTableResizeStart}
              role="separator"
              aria-orientation="vertical"
              aria-label="Изменить ширину таблицы"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
