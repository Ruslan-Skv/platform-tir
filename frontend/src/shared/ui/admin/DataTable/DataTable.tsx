'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import styles from './DataTable.module.css';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  /** Ключ для сортировки (при отличии от key, напр. category → category.name) */
  sortKey?: string;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  /** Начальная сортировка по умолчанию */
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  /** Если задан — сортировка (ключ + порядок) сохраняется в localStorage */
  sortStorageKey?: string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  /** Управляемый выбор: если передан, таблица использует этот массив (при сбросе выбора родителем отображается актуально) */
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  /** ID строк для подсветки (например, цена поставщика изменилась) */
  highlightedIds?: string[];
  /** CSS-класс для подсвеченных строк */
  highlightedRowClassName?: string;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  /** Сортировка на сервере: стрелки в шапке, данные не пересортировываются локально */
  serverSideSort?: boolean;
  controlledSortBy?: string | null;
  controlledSortOrder?: SortOrder;
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;
  /** Дополнительный класс на внешний контейнер таблицы */
  containerClassName?: string;
  /** Класс активной кнопки страницы (вместо стандартного accent) */
  paginationActiveClassName?: string;
}

type SortOrder = 'asc' | 'desc';

function loadPersistedSortState(params: {
  storageKey?: string;
  defaultSortBy?: string;
  defaultSortOrder: SortOrder;
}): { sortBy: string | null; sortOrder: SortOrder } {
  const { storageKey, defaultSortBy, defaultSortOrder } = params;

  const fallback: { sortBy: string | null; sortOrder: SortOrder } = {
    sortBy: defaultSortBy ?? null,
    sortOrder: defaultSortOrder,
  };

  if (!storageKey || typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const obj = parsed as Record<string, unknown>;
    const sortBy = typeof obj.sortBy === 'string' ? obj.sortBy : obj.sortBy === null ? null : null;
    const sortOrder = obj.sortOrder === 'asc' || obj.sortOrder === 'desc' ? obj.sortOrder : null;
    return { sortBy, sortOrder: sortOrder ?? fallback.sortOrder };
  } catch {
    return fallback;
  }
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  defaultSortBy,
  defaultSortOrder = 'asc',
  sortStorageKey,
  onRowClick,
  selectable = false,
  selectedIds: selectedIdsProp,
  onSelectionChange,
  highlightedIds,
  highlightedRowClassName,
  loading = false,
  emptyMessage = 'Нет данных',
  pagination,
  serverSideSort = false,
  controlledSortBy = null,
  controlledSortOrder = 'asc',
  onSortChange,
  containerClassName,
  paginationActiveClassName,
}: DataTableProps<T>) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const isControlled = selectedIdsProp !== undefined;
  const selectedIds = isControlled ? selectedIdsProp : internalSelectedIds;

  const initialSortRef = useRef<{ sortBy: string | null; sortOrder: SortOrder } | null>(null);
  if (initialSortRef.current === null) {
    initialSortRef.current = loadPersistedSortState({
      storageKey: sortStorageKey,
      defaultSortBy,
      defaultSortOrder,
    });
  }

  const [sortBy, setSortBy] = useState<string | null>(initialSortRef.current.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortRef.current.sortOrder);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const isScrollingLeftRef = useRef(false);
  const isScrollingRightRef = useRef(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // При смене ключа хранения (например, разные страницы/вкладки) — подхватить сохранённую сортировку
  useEffect(() => {
    const next = loadPersistedSortState({
      storageKey: sortStorageKey,
      defaultSortBy,
      defaultSortOrder,
    });
    setSortBy(next.sortBy);
    setSortOrder(next.sortOrder);
  }, [sortStorageKey, defaultSortBy, defaultSortOrder]);

  // Persist sorting
  useEffect(() => {
    if (!sortStorageKey || typeof window === 'undefined') return;
    try {
      localStorage.setItem(sortStorageKey, JSON.stringify({ sortBy, sortOrder }));
    } catch {
      // ignore
    }
  }, [sortStorageKey, sortBy, sortOrder]);

  const handleSelectAll = () => {
    if (selectedIds.length === displayData.length && displayData.length > 0) {
      if (!isControlled) setInternalSelectedIds([]);
      onSelectionChange?.([]);
    } else {
      const allIds = displayData.map(keyExtractor);
      if (!isControlled) setInternalSelectedIds(allIds);
      onSelectionChange?.(allIds);
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    if (!isControlled) setInternalSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const isServerSort = Boolean(serverSideSort && onSortChange);
  const activeSortBy = isServerSort ? controlledSortBy : sortBy;
  const activeSortOrder = isServerSort ? controlledSortOrder : sortOrder;

  const handleSort = (key: string) => {
    if (isServerSort && onSortChange) {
      if (activeSortBy === key) {
        onSortChange(key, activeSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        onSortChange(key, 'asc');
      }
      return;
    }
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

  const compareValues = (a: unknown, b: unknown, order: 'asc' | 'desc'): number => {
    const aNull = a === null || a === undefined;
    const bNull = b === null || b === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return order === 'asc' ? 1 : -1;
    if (bNull) return order === 'asc' ? -1 : 1;
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      const va = a ? 1 : 0;
      const vb = b ? 1 : 0;
      return order === 'asc' ? va - vb : vb - va;
    }
    const aNum = typeof a === 'number' ? a : parseFloat(String(a));
    const bNum = typeof b === 'number' ? b : parseFloat(String(b));
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return order === 'asc' ? aNum - bNum : bNum - aNum;
    }
    const sa = String(a).toLowerCase();
    const sb = String(b).toLowerCase();
    const cmp = sa.localeCompare(sb, undefined, { numeric: true });
    return order === 'asc' ? cmp : -cmp;
  };

  const sortedData = useMemo(() => {
    if (isServerSort || !sortBy || data.length === 0) return data;
    return [...data].sort((a, b) => {
      const aVal = getValue(a, sortBy);
      const bVal = getValue(b, sortBy);
      return compareValues(aVal, bVal, sortOrder);
    });
  }, [data, isServerSort, sortBy, sortOrder]);

  const displayData = sortedData;
  const showLoadingPlaceholder = loading && displayData.length === 0;
  const isRefreshing = loading && displayData.length > 0;

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
    <div className={[styles.tableContainer, containerClassName].filter(Boolean).join(' ')}>
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
                      checked={selectedIds.length === displayData.length && displayData.length > 0}
                      onChange={handleSelectAll}
                      className={styles.checkbox}
                    />
                  </th>
                )}
                {columns.map((column) => {
                  const sortKey = column.sortKey ?? String(column.key);
                  return (
                    <th
                      key={String(column.key)}
                      style={{ width: column.width }}
                      className={column.sortable ? styles.sortable : ''}
                      onClick={() => column.sortable && handleSort(sortKey)}
                    >
                      <span className={styles.headerContent}>
                        {column.title}
                        {column.sortable ? (
                          <span
                            className={`${styles.sortIcon} ${
                              activeSortBy === sortKey ? styles.sortIconActive : styles.sortIconIdle
                            }`}
                            aria-hidden
                          >
                            {activeSortBy === sortKey
                              ? activeSortOrder === 'asc'
                                ? '↑'
                                : '↓'
                              : '↕'}
                          </span>
                        ) : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className={isRefreshing ? styles.tbodyRefreshing : undefined}>
              {showLoadingPlaceholder ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className={styles.loadingCell}
                  >
                    <div className={styles.loader}>Загрузка...</div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className={styles.emptyCell}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                displayData.map((item) => {
                  const id = keyExtractor(item);
                  const isHighlighted = highlightedIds?.includes(id) && highlightedRowClassName;
                  return (
                    <tr
                      key={id}
                      className={`${styles.row} ${onRowClick ? styles.clickable : ''} ${
                        selectedIds.includes(id) ? styles.selected : ''
                      } ${isHighlighted ? highlightedRowClassName : ''}`}
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
                      page === pagination.page ? (paginationActiveClassName ?? styles.active) : ''
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
