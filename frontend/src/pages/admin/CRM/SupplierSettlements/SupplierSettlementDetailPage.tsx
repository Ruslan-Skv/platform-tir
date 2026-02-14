'use client';

import { Trash2, Undo2 } from 'lucide-react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { getSupplierSettlements, saveSupplierSettlements } from '@/shared/api/admin-crm';

import styles from './SupplierSettlementDetailPage.module.css';
import { SupplierSettlementHistoryModal } from './SupplierSettlementHistoryModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Supplier {
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

function createEmptyRow(id?: string): SupplierSettlementRow {
  return {
    id: id ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: '',
    invoice: '',
    amount: null,
    payment: null,
    note: '',
  };
}

function getInitialRows(): SupplierSettlementRow[] {
  return Array.from({ length: 5 }, () => createEmptyRow());
}

type ColumnKey = keyof SupplierSettlementRow | '_index' | '_action';
type ColumnType = 'date' | 'number' | 'text' | 'index' | 'action';

const COLUMNS: { key: ColumnKey; title: string; type: ColumnType }[] = [
  { key: '_index', title: '№п/п', type: 'index' },
  { key: 'date', title: 'Дата', type: 'date' },
  { key: 'invoice', title: 'Счёт', type: 'text' },
  { key: 'amount', title: 'Стоимость', type: 'number' },
  { key: 'payment', title: 'Оплата', type: 'number' },
  { key: 'note', title: 'Примечание', type: 'text' },
  { key: '_action', title: '', type: 'action' },
];

const DEFAULT_COLUMN_WIDTHS = [50, 110, 100, 100, 100, 180, 36];
const MIN_COL_WIDTH = 28;
const MAX_COL_WIDTH = 400;
const COL_WIDTH_STORAGE_KEY = 'supplier-settlement-column-widths';
const VISIBLE_ROWS_STORAGE_KEY = 'supplier-settlement-visible-rows';
const VISIBLE_ROW_OPTIONS = [15, 20, 25, 30, 35] as const;
const ROW_HEIGHT = 27;
const HEADER_ROW_HEIGHT = 22;
const HEADER_ROWS_COUNT = 3;

function formatSum(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
const UNDO_MAX_STEPS = 10;
const AUTO_SAVE_DEBOUNCE_MS = 800;

function loadColumnWidths(supplierId: string): number[] {
  if (typeof window === 'undefined') return [...DEFAULT_COLUMN_WIDTHS];
  const key = supplierId ? `${COL_WIDTH_STORAGE_KEY}-${supplierId}` : COL_WIDTH_STORAGE_KEY;
  try {
    const s = window.localStorage.getItem(key);
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

function saveColumnWidths(supplierId: string, widths: number[]) {
  if (typeof window !== 'undefined') {
    const key = supplierId ? `${COL_WIDTH_STORAGE_KEY}-${supplierId}` : COL_WIDTH_STORAGE_KEY;
    window.localStorage.setItem(key, JSON.stringify(widths));
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

interface SettlementSnapshot {
  data: SupplierSettlementRow[];
}

export function SupplierSettlementDetailPage() {
  const params = useParams();
  const supplierId = (params.id as string) ?? '';
  const { getAuthHeaders } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SupplierSettlementRow[]>(getInitialRows);
  const [columnWidths, setColumnWidths] = useState<number[]>(() => loadColumnWidths(supplierId));
  const [visibleRowCount, setVisibleRowCount] = useState(loadVisibleRowCount);
  const [history, setHistory] = useState<SettlementSnapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);
  const isUndoRef = useRef(false);
  const resizeRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const tableResizeRef = useRef<{
    startX: number;
    startLastCol: number;
    restSum: number;
  } | null>(null);

  useEffect(() => {
    setColumnWidths(loadColumnWidths(supplierId));
  }, [supplierId]);

  const fetchSupplier = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/catalog/suppliers/${supplierId}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const res = await response.json();
        setSupplier(res);
      }
    } catch (error) {
      console.error('Failed to fetch supplier:', error);
    } finally {
      setLoading(false);
    }
  }, [supplierId, getAuthHeaders]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  const dataRef = useRef(data);
  dataRef.current = data;
  const skipNextSaveRef = useRef(false);
  const settlementsLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSave = useCallback(async () => {
    const rows = dataRef.current;
    if (!supplierId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const saved = await saveSupplierSettlements(
        supplierId,
        rows.map((r, i) => ({
          date: r.date || undefined,
          invoice: r.invoice || undefined,
          amount: r.amount,
          payment: r.payment,
          note: r.note || undefined,
          sortOrder: i,
        }))
      );
      skipNextSaveRef.current = true;
      setData(
        saved.map((r) => ({
          id: r.id,
          date: r.date ?? '',
          invoice: r.invoice ?? '',
          amount: r.amount,
          payment: r.payment,
          note: r.note ?? '',
        }))
      );
      setHistory([]);
      setSaveMessage({ type: 'success', text: 'Сохранено' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка сохранения',
      });
    } finally {
      setSaving(false);
    }
  }, [supplierId]);

  const loadSettlements = useCallback(async () => {
    if (!supplierId) return;
    try {
      const rows = await getSupplierSettlements(supplierId);
      skipNextSaveRef.current = true;
      if (rows.length > 0) {
        setData(
          rows.map((r) => ({
            id: r.id,
            date: r.date ?? '',
            invoice: r.invoice ?? '',
            amount: r.amount,
            payment: r.payment,
            note: r.note ?? '',
          }))
        );
      }
      settlementsLoadedRef.current = true;
    } catch (err) {
      console.error('Failed to load settlements:', err);
      settlementsLoadedRef.current = true;
    }
  }, [supplierId]);

  useEffect(() => {
    settlementsLoadedRef.current = false;
  }, [supplierId]);

  useEffect(() => {
    if (supplier) {
      loadSettlements();
    }
  }, [supplier, loadSettlements]);

  useEffect(() => {
    if (!supplierId || !supplier || !settlementsLoadedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      performSave();
    }, AUTO_SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, supplierId, supplier, performSave]);

  const pushHistory = useCallback(() => {
    if (isUndoRef.current) return;
    setHistory((prev) => {
      const snap: SettlementSnapshot = { data: data.map((r) => ({ ...r })) };
      return [...prev, snap].slice(-UNDO_MAX_STEPS);
    });
  }, [data]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const snap = next.pop()!;
      isUndoRef.current = true;
      setData(snap.data.map((r) => ({ ...r })));
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

  const clearRange = useCallback(
    (minRow: number, minCol: number, maxRow: number, maxCol: number) => {
      pushHistory();
      setData((prev) =>
        prev.map((row, ri) => {
          if (ri < minRow || ri > maxRow) return row;
          const updates: Partial<SupplierSettlementRow> = {};
          for (let ci = minCol; ci <= maxCol; ci++) {
            const key = COLUMNS[ci].key;
            if (key === '_index' || key === '_action') continue;
            if (key === 'date' || key === 'invoice' || key === 'note') {
              (updates as Record<string, unknown>)[key] = '';
            } else if (key === 'amount' || key === 'payment') {
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

  const updateCell = useCallback(
    (rowId: string, field: keyof SupplierSettlementRow, value: string | number | null) => {
      pushHistory();
      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          if (field === 'date') {
            return { ...row, date: typeof value === 'string' ? value : '' };
          }
          if (field === 'invoice' || field === 'note') {
            return { ...row, [field]: value === '' || value === null ? '' : String(value) };
          }
          if (field === 'amount' || field === 'payment') {
            const num = typeof value === 'number' ? value : parseNumeric(String(value ?? ''));
            return { ...row, [field]: num };
          }
          return row;
        })
      );
    },
    [pushHistory]
  );

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
          saveColumnWidths(supplierId, prev);
          return prev;
        });
        resizeRef.current = null;
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [columnWidths, supplierId]
  );

  const handleTableResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const restSum = columnWidths.slice(0, -1).reduce((a, b) => a + b, 0);
      const startLastCol = columnWidths[columnWidths.length - 1] ?? 0;
      tableResizeRef.current = { startX: e.clientX, startLastCol, restSum };
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
          saveColumnWidths(supplierId, prev);
          return prev;
        });
        tableResizeRef.current = null;
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [columnWidths, supplierId]
  );

  const amountSum = useMemo(() => data.reduce((s, r) => s + (Number(r.amount) || 0), 0), [data]);

  const paymentSum = useMemo(() => data.reduce((s, r) => s + (Number(r.payment) || 0), 0), [data]);

  const amountPaymentDiff = useMemo(() => amountSum - paymentSum, [amountSum, paymentSum]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>Поставщик не найден</p>
        <Link href="/admin/crm/supplier-settlements" className={styles.backLink}>
          ← Назад к списку
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerLinks}>
            <Link href="/admin/crm/supplier-settlements" className={styles.backLink}>
              ← Назад к списку
            </Link>
            {supplierId && (
              <Link
                href={`/admin/catalog/suppliers/${supplierId}/edit`}
                className={styles.supplierDetailsLink}
              >
                Реквизиты поставщика →
              </Link>
            )}
          </div>
          <h1 className={styles.title}>Расчёты с поставщиком</h1>
          <p className={styles.supplierName}>
            {supplier.legalName}
            {supplier.commercialName && (
              <span className={styles.commercialName}> ({supplier.commercialName})</span>
            )}
          </p>
        </div>
        <div className={styles.headerActions}>
          {saving && <span className={styles.savingIndicator}>Сохранение...</span>}
          <button
            type="button"
            className={styles.historyBtn}
            onClick={() => setShowHistoryModal(true)}
          >
            История
          </button>
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

      {saveMessage && (
        <div
          className={saveMessage.type === 'success' ? styles.messageSuccess : styles.messageError}
        >
          {saveMessage.text}
        </div>
      )}

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
                    if (col.key === 'amount') {
                      return (
                        <th
                          key="amount-payment-diff"
                          colSpan={2}
                          className={styles.thDiff}
                          title="Стоимость − Оплата"
                        >
                          Итого: {formatSum(amountPaymentDiff)}
                        </th>
                      );
                    }
                    if (col.key === 'payment') return null;
                    return <th key={col.key} className={styles.thDiff} />;
                  })}
                </tr>
                <tr className={styles.totalsRow}>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className={styles.th}>
                      {col.key === 'amount'
                        ? formatSum(amountSum)
                        : col.key === 'payment'
                          ? formatSum(paymentSum)
                          : ''}
                    </th>
                  ))}
                </tr>
                <tr className={styles.headerRow}>
                  {COLUMNS.map((col, colIndex) => (
                    <th
                      key={col.key}
                      className={
                        col.key === '_action' ? styles.th : `${styles.th} ${styles.thResizable}`
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
                            col.type === 'index' && styles.tdIndex,
                            col.type === 'action' && styles.tdAction,
                            isSelected && styles.tdSelected,
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
                              value={String(row[col.key as keyof SupplierSettlementRow] ?? '')}
                              onChange={(e) =>
                                updateCell(
                                  row.id,
                                  col.key as keyof SupplierSettlementRow,
                                  e.target.value
                                )
                              }
                              aria-label={col.title}
                            />
                          ) : (
                            <input
                              type="number"
                              className={styles.input}
                              inputMode="decimal"
                              step="0.01"
                              value={row[col.key as keyof SupplierSettlementRow] ?? ''}
                              onChange={(e) =>
                                updateCell(
                                  row.id,
                                  col.key as keyof SupplierSettlementRow,
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

      {showHistoryModal && supplierId && (
        <SupplierSettlementHistoryModal
          supplierId={supplierId}
          supplierName={supplier?.legalName}
          onClose={() => setShowHistoryModal(false)}
          onRollback={loadSettlements}
        />
      )}
    </div>
  );
}
