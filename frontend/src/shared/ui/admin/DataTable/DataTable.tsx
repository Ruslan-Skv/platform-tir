'use client';

import { useState } from 'react';

import styles from './DataTable.module.css';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  selectable = false,
  onSelectionChange,
  loading = false,
  emptyMessage = 'Нет данных',
  pagination,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
      onSelectionChange?.([]);
    } else {
      const allIds = data.map(keyExtractor);
      setSelectedIds(allIds);
      onSelectionChange?.(allIds);
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    setSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const getValue = (item: T, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = item;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {selectable && (
                <th className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className={styles.checkbox}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className={column.sortable ? styles.sortable : ''}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <span className={styles.headerContent}>
                    {column.title}
                    {column.sortable && sortBy === String(column.key) && (
                      <span className={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className={styles.loadingCell}>
                  <div className={styles.loader}>Загрузка...</div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className={styles.emptyCell}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const id = keyExtractor(item);
                return (
                  <tr
                    key={id}
                    className={`${styles.row} ${onRowClick ? styles.clickable : ''} ${
                      selectedIds.includes(id) ? styles.selected : ''
                    }`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(id)}
                          onChange={() => handleSelectItem(id)}
                          className={styles.checkbox}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={String(column.key)}>
                        {column.render
                          ? column.render(item)
                          : String(getValue(item, String(column.key)) ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            {totalPages > 1 ? (
              <>
                Показано {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} из{' '}
                {pagination.total}
              </>
            ) : (
              <>Всего: {pagination.total}</>
            )}
          </span>
          {totalPages > 1 && (
            <div className={styles.paginationButtons}>
              <button
                className={styles.pageButton}
                disabled={pagination.page === 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                ←
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (pagination.page <= 3) {
                  page = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={page}
                    className={`${styles.pageButton} ${
                      page === pagination.page ? styles.active : ''
                    }`}
                    onClick={() => pagination.onPageChange(page)}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                className={styles.pageButton}
                disabled={pagination.page === totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
