'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  COLUMNS,
  MAX_COL_WIDTH,
  MIN_COL_WIDTH,
  NUMERIC_KEYS,
  SUM_COLUMN_KEYS,
  TEXT_COLUMN_KEYS,
  UNDO_MAX_STEPS,
} from '../cash-register-page.constants';
import type {
  CashRegisterRow,
  CashRegisterSnapshot,
  SelectionRange,
} from '../cash-register-page.types';
import {
  createEmptyRow,
  getInitialRows,
  loadColumnWidths,
  loadVisibleRowCount,
  parseNumeric,
  saveColumnWidths,
  saveVisibleRowCount,
} from '../cash-register-page.utils';

export function useCashRegisterPage() {
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

  const handleOpeningBalanceChange = useCallback(
    (value: string) => {
      pushHistory();
      setOpeningBalance(value === '' ? null : Number(value) || null);
    },
    [pushHistory]
  );

  const handleOpeningBalanceAlphaChange = useCallback(
    (value: string) => {
      pushHistory();
      setOpeningBalanceAlpha(value === '' ? null : Number(value) || null);
    },
    [pushHistory]
  );

  const handleOpeningBalanceSberChange = useCallback(
    (value: string) => {
      pushHistory();
      setOpeningBalanceSber(value === '' ? null : Number(value) || null);
    },
    [pushHistory]
  );

  const handleVisibleRowCountChange = useCallback((count: number) => {
    setVisibleRowCount(count as ReturnType<typeof loadVisibleRowCount>);
    saveVisibleRowCount(count);
  }, []);

  return {
    data,
    openingBalance,
    openingBalanceAlpha,
    openingBalanceSber,
    selectionRange,
    columnWidths,
    visibleRowCount,
    history,
    tableRef,
    totals,
    closingBalance,
    closingBalanceAlpha,
    closingBalanceSber,
    totalClosingBalance,
    handleColumnResizeStart,
    handleTableResizeStart,
    undo,
    addRow,
    deleteRow,
    updateCell,
    handleTableClick,
    handleTableKeyDown,
    handleOpeningBalanceChange,
    handleOpeningBalanceAlphaChange,
    handleOpeningBalanceSberChange,
    handleVisibleRowCountChange,
  };
}

export type CashRegisterPageModel = ReturnType<typeof useCashRegisterPage>;
