'use client';

import { Trash2, Undo2 } from 'lucide-react';

import Link from 'next/link';

import { ResizableSpreadsheetColGroup } from '../../shared/ResizableSpreadsheetColGroup';
import { SpreadsheetTableViewport } from '../../shared/SpreadsheetTableViewport';
import { SupplierSettlementHistoryModal } from '../modals/SupplierSettlementHistoryModal';
import styles from './SupplierSettlementDetailPage.module.css';
import type { SupplierSettlementDetailPageModel } from './hooks/useSupplierSettlementDetailPage';
import {
  COLUMNS,
  HEADER_ROWS_COUNT,
  HEADER_ROW_HEIGHT,
  ROW_HEIGHT,
  UNDO_MAX_STEPS,
  VISIBLE_ROW_OPTIONS,
} from './supplier-settlement-detail-page.constants';
import type { SupplierSettlementRow } from './supplier-settlement-detail-page.types';
import { formatSum } from './supplier-settlement-detail-page.utils';

type SupplierSettlementDetailPageViewProps = {
  model: SupplierSettlementDetailPageModel;
};

export function SupplierSettlementDetailPageView({ model }: SupplierSettlementDetailPageViewProps) {
  const {
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
  } = model;

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

      {saveMessage && (
        <div
          className={saveMessage.type === 'success' ? styles.messageSuccess : styles.messageError}
        >
          {saveMessage.text}
        </div>
      )}

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
                {COLUMNS.map((col) => {
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
        </SpreadsheetTableViewport>
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
