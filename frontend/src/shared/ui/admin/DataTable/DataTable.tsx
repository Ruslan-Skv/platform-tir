'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const isScrollingLeftRef = useRef(false);
  const isScrollingRightRef = useRef(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Функция для остановки прокрутки
  const stopScrolling = useCallback(() => {
    isScrollingLeftRef.current = false;
    isScrollingRightRef.current = false;
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // Функция для запуска прокрутки
  const startScrolling = useCallback((direction: 'left' | 'right') => {
    // Останавливаем предыдущую прокрутку
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const scrollStep = 10; // Шаг прокрутки в пикселях
    const scrollInterval = 16; // Интервал в миллисекундах (~60fps)

    if (direction === 'left') {
      isScrollingLeftRef.current = true;
      isScrollingRightRef.current = false;
    } else {
      isScrollingRightRef.current = true;
      isScrollingLeftRef.current = false;
    }

    scrollIntervalRef.current = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) {
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
        return;
      }

      if (isScrollingLeftRef.current) {
        const newScrollLeft = Math.max(0, container.scrollLeft - scrollStep);
        container.scrollLeft = newScrollLeft;
        if (newScrollLeft === 0) {
          isScrollingLeftRef.current = false;
          if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
        }
      } else if (isScrollingRightRef.current) {
        const maxScroll = container.scrollWidth - container.clientWidth;
        const newScrollLeft = Math.min(maxScroll, container.scrollLeft + scrollStep);
        container.scrollLeft = newScrollLeft;
        if (newScrollLeft >= maxScroll - 1) {
          isScrollingRightRef.current = false;
          if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
        }
      } else {
        // Если оба флага false, останавливаем интервал
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
      }
    }, scrollInterval);
  }, []);

  // Проверка необходимости показа стрелок и обновление их видимости
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const checkScrollability = () => {
      const hasHorizontalScroll = scrollContainer.scrollWidth > scrollContainer.clientWidth;
      const scrollLeft = scrollContainer.scrollLeft;
      const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;

      const shouldShowLeft = hasHorizontalScroll && scrollLeft > 5;
      const shouldShowRight = hasHorizontalScroll && scrollLeft < maxScrollLeft - 5;

      // Если стрелка скрывается во время прокрутки, останавливаем её
      if (!shouldShowLeft && isScrollingLeftRef.current) {
        stopScrolling();
      }
      if (!shouldShowRight && isScrollingRightRef.current) {
        stopScrolling();
      }

      // Показываем стрелку влево, если есть скролл и мы не в начале
      setShowLeftArrow(shouldShowLeft);
      // Показываем стрелку вправо, если есть скролл и мы не в конце
      setShowRightArrow(shouldShowRight);
    };

    checkScrollability();

    const handleScroll = () => {
      checkScrollability();
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkScrollability);

    // Проверяем после рендера
    setTimeout(checkScrollability, 0);
    setTimeout(checkScrollability, 100);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [data, columns, stopScrolling]);
  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        {/* Стрелка влево */}
        {showLeftArrow && (
          <div
            className={`${styles.scrollArrow} ${styles.scrollArrowLeft}`}
            onMouseEnter={() => startScrolling('left')}
            onMouseLeave={stopScrolling}
          >
            ←
          </div>
        )}
        {/* Контейнер со скроллом */}
        <div className={styles.scrollContainer} ref={scrollContainerRef}>
          <table className={styles.table}>
            <thead className={styles.stickyHeader}>
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
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className={styles.loadingCell}
                  >
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
        {/* Стрелка вправо */}
        {showRightArrow && (
          <div
            className={`${styles.scrollArrow} ${styles.scrollArrowRight}`}
            onMouseEnter={() => startScrolling('right')}
            onMouseLeave={stopScrolling}
          >
            →
          </div>
        )}
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
