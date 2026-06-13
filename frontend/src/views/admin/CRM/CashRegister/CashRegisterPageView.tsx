'use client';

import { Trash2, Undo2 } from 'lucide-react';

import { ResizableSpreadsheetColGroup } from '../shared/ResizableSpreadsheetColGroup';
import { SpreadsheetTableViewport } from '../shared/SpreadsheetTableViewport';
import styles from './CashRegisterPage.module.css';
import {
  COLUMNS,
  GREEN_COLUMN_KEYS,
  HEADER_ROWS_COUNT,
  HEADER_ROW_HEIGHT,
  RED_COLUMN_KEYS,
  ROW_HEIGHT,
  SUM_COLUMN_KEYS,
  UNDO_MAX_STEPS,
  VISIBLE_ROW_OPTIONS,
} from './cash-register-page.constants';
import type { CashRegisterRow } from './cash-register-page.types';
import { formatSum } from './cash-register-page.utils';
import type { CashRegisterPageModel } from './hooks/useCashRegisterPage';

type CashRegisterPageViewProps = {
  model: CashRegisterPageModel;
};

export function CashRegisterPageView({ model }: CashRegisterPageViewProps) {
  const {
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
  } = model;

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
              onChange={(e) => handleOpeningBalanceChange(e.target.value)}
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
              onChange={(e) => handleOpeningBalanceAlphaChange(e.target.value)}
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
              onChange={(e) => handleOpeningBalanceSberChange(e.target.value)}
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
              onChange={(e) => handleVisibleRowCountChange(Number(e.target.value))}
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
        <SpreadsheetTableViewport
          maxHeight={HEADER_ROWS_COUNT * HEADER_ROW_HEIGHT + visibleRowCount * ROW_HEIGHT}
          totalWidth={columnWidths.reduce((a, b) => a + b, 0)}
          wrapClassName={styles.tableWrap}
          containerClassName={styles.tableResizeContainer}
        >
          <table
            ref={tableRef}
            className={styles.table}
            onKeyDown={handleTableKeyDown}
            onClick={handleTableClick}
          >
            <ResizableSpreadsheetColGroup
              columnKeys={COLUMNS.map((col) => col.key)}
              columnWidths={columnWidths}
            />
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
        </SpreadsheetTableViewport>
      </div>
    </div>
  );
}
