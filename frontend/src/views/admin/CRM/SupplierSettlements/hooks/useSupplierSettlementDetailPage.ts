'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useParams } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { getSupplierSettlements, saveSupplierSettlements } from '@/shared/api/admin-crm';
import { apiFetch } from '@/shared/lib/api-fetch';

import {
  API_URL,
  AUTO_SAVE_DEBOUNCE_MS,
  COLUMNS,
  MAX_COL_WIDTH,
  MIN_COL_WIDTH,
  UNDO_MAX_STEPS,
} from '../supplier-settlement-detail-page.constants';
import type {
  SelectionRange,
  SettlementSnapshot,
  Supplier,
  SupplierSettlementRow,
} from '../supplier-settlement-detail-page.types';
import {
  createEmptyRow,
  getInitialRows,
  loadColumnWidths,
  loadVisibleRowCount,
  parseNumeric,
  saveColumnWidths,
  saveVisibleRowCount,
} from '../supplier-settlement-detail-page.utils';

export function useSupplierSettlementDetailPage() {
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
      const response = await apiFetch(`${API_URL}/admin/catalog/suppliers/${supplierId}`, {
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

  const handleVisibleRowCountChange = useCallback((count: number) => {
    setVisibleRowCount(count as ReturnType<typeof loadVisibleRowCount>);
    saveVisibleRowCount(count);
  }, []);

  return {
    supplierId,
    supplier,
    loading,
    data,
    columnWidths,
    visibleRowCount,
    history,
    saving,
    saveMessage,
    showHistoryModal,
    setShowHistoryModal,
    selectionRange,
    tableRef,
    amountSum,
    paymentSum,
    amountPaymentDiff,
    handleColumnResizeStart,
    handleTableResizeStart,
    undo,
    addRow,
    deleteRow,
    updateCell,
    handleTableClick,
    handleTableKeyDown,
    loadSettlements,
    handleVisibleRowCountChange,
  };
}

export type SupplierSettlementDetailPageModel = ReturnType<typeof useSupplierSettlementDetailPage>;
