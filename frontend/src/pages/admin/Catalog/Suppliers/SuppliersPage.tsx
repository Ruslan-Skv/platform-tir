'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './SuppliersPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const STORAGE_KEY = 'suppliers_table_columns';

// Форматирование телефона для отображения
function formatPhone(phone: string): string {
  // Удаляем все нецифровые символы
  const digits = phone.replace(/\D/g, '');

  // Форматируем российские номера
  if (digits.startsWith('7') && digits.length === 11) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }

  // Форматируем номера без кода страны (10 цифр)
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }

  // Если не подходит под формат, возвращаем как есть
  return phone;
}

// Определение всех доступных колонок
interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible: boolean;
  render: (supplier: Supplier) => React.ReactNode;
}

type ColumnKey =
  | 'legalName'
  | 'commercialName'
  | 'inn'
  | 'phone'
  | 'email'
  | 'website'
  | 'legalAddress'
  | 'bankName'
  | 'bankAccount'
  | 'bankBik'
  | 'productsCount'
  | 'isActive'
  | 'actions';

interface Supplier {
  id: string;
  legalName: string;
  commercialName?: string | null;
  website?: string | null;
  legalAddress?: string | null;
  inn?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankBik?: string | null;
  email?: string | null;
  phone?: string[] | null;
  isActive: boolean;
  _count?: {
    products: number;
  };
}

export function SuppliersPage() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    supplier: Supplier | null;
  }>({ isOpen: false, supplier: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);

  const openDeleteModal = (supplier: Supplier) => {
    setDeleteModal({ isOpen: true, supplier });
    setDeleteError(null);
  };

  // Определение всех доступных колонок (внутри компонента для доступа к router и openDeleteModal)
  const allColumns = useMemo<Record<ColumnKey, ColumnDefinition>>(
    () => ({
      legalName: {
        key: 'legalName',
        label: 'Наименование юридическое',
        defaultVisible: true,
        render: (supplier) => <div className={styles.supplierName}>{supplier.legalName}</div>,
      },
      commercialName: {
        key: 'commercialName',
        label: 'Наименование коммерческое',
        defaultVisible: true,
        render: (supplier) => (
          <div className={styles.supplierName}>{supplier.commercialName || '-'}</div>
        ),
      },
      inn: {
        key: 'inn',
        label: 'ИНН',
        defaultVisible: true,
        render: (supplier) =>
          supplier.inn ? (
            <span className={styles.innValue}>{supplier.inn}</span>
          ) : (
            <span className={styles.emptyValue}>-</span>
          ),
      },
      phone: {
        key: 'phone',
        label: 'Телефоны',
        defaultVisible: true,
        render: (supplier) =>
          supplier.phone && supplier.phone.length > 0 ? (
            <div className={styles.phonesList}>
              {supplier.phone.map((phone, index) => (
                <a
                  key={index}
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className={styles.phoneLink}
                >
                  {formatPhone(phone)}
                </a>
              ))}
            </div>
          ) : (
            <span className={styles.emptyValue}>-</span>
          ),
      },
      email: {
        key: 'email',
        label: 'Email',
        defaultVisible: false,
        render: (supplier) =>
          supplier.email ? (
            <a href={`mailto:${supplier.email}`} className={styles.emailLink}>
              {supplier.email}
            </a>
          ) : (
            <span className={styles.emptyValue}>-</span>
          ),
      },
      website: {
        key: 'website',
        label: 'Сайт',
        defaultVisible: true,
        render: (supplier) =>
          supplier.website ? (
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.websiteLink}
            >
              {supplier.website}
            </a>
          ) : (
            <span className={styles.emptyValue}>-</span>
          ),
      },
      legalAddress: {
        key: 'legalAddress',
        label: 'Юридический адрес',
        defaultVisible: false,
        render: (supplier) => (
          <span className={styles.textValue}>{supplier.legalAddress || '-'}</span>
        ),
      },
      bankName: {
        key: 'bankName',
        label: 'Банк',
        defaultVisible: false,
        render: (supplier) => <span className={styles.textValue}>{supplier.bankName || '-'}</span>,
      },
      bankAccount: {
        key: 'bankAccount',
        label: 'Расчетный счет',
        defaultVisible: false,
        render: (supplier) => (
          <span className={styles.textValue}>{supplier.bankAccount || '-'}</span>
        ),
      },
      bankBik: {
        key: 'bankBik',
        label: 'БИК',
        defaultVisible: false,
        render: (supplier) => <span className={styles.textValue}>{supplier.bankBik || '-'}</span>,
      },
      productsCount: {
        key: 'productsCount',
        label: 'Товаров',
        defaultVisible: true,
        render: (supplier) => (
          <span className={styles.productCount}>{supplier._count?.products || 0}</span>
        ),
      },
      isActive: {
        key: 'isActive',
        label: 'Статус',
        defaultVisible: true,
        render: (supplier) =>
          supplier.isActive ? (
            <span className={styles.activeBadge}>Активен</span>
          ) : (
            <span className={styles.inactiveBadge}>Неактивен</span>
          ),
      },
      actions: {
        key: 'actions',
        label: 'Действия',
        defaultVisible: true,
        render: (supplier) => (
          <div className={styles.actions}>
            <Link
              href={`/admin/crm/supplier-settlements/${supplier.id}`}
              className={styles.settlementsButton}
              title="Расчёты с поставщиком"
            >
              💰
            </Link>
            <button
              className={styles.editButton}
              onClick={() => router.push(`/admin/catalog/suppliers/${supplier.id}/edit`)}
              title="Редактировать"
            >
              ✏️
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => openDeleteModal(supplier)}
              title="Удалить"
            >
              🗑️
            </button>
          </div>
        ),
      },
    }),
    [router]
  );

  // Загрузка настроек колонок из localStorage (массив для сохранения порядка)
  const loadColumnSettings = useCallback((): ColumnKey[] => {
    const defaultColumns = Object.keys(allColumns).filter(
      (key) => allColumns[key as ColumnKey].defaultVisible
    ) as ColumnKey[];

    if (typeof window === 'undefined') {
      return defaultColumns;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnKey[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Убеждаемся, что 'actions' всегда включен
          const result = parsed.includes('actions') ? parsed : [...parsed, 'actions'];
          return result;
        }
      }
    } catch {
      // Игнорируем ошибки парсинга
    }

    // Возвращаем колонки по умолчанию
    return defaultColumns;
  }, [allColumns]);

  // Инициализация видимых колонок
  const getDefaultColumns = useCallback((): ColumnKey[] => {
    return Object.keys(allColumns).filter(
      (key) => allColumns[key as ColumnKey].defaultVisible
    ) as ColumnKey[];
  }, [allColumns]);

  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>([]);

  // Загружаем настройки при монтировании (после определения allColumns)
  useEffect(() => {
    const saved = loadColumnSettings();
    // Убеждаемся, что 'actions' всегда включен
    const result = saved.includes('actions') ? saved : [...saved, 'actions'];
    setSelectedColumns(result);
  }, [loadColumnSettings]);

  // Сохранение настроек колонок в localStorage
  const saveColumnSettings = (columns: ColumnKey[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
      } catch {
        // Игнорируем ошибки сохранения
      }
    }
  };

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };

    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);

  const toggleColumn = (columnKey: ColumnKey) => {
    // Не позволяем скрыть колонку 'actions'
    if (columnKey === 'actions') return;

    setSelectedColumns((prev) => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter((k) => k !== columnKey)
        : [...prev, columnKey];
      // Убеждаемся, что 'actions' всегда включен
      const result = newColumns.includes('actions') ? newColumns : [...newColumns, 'actions'];
      saveColumnSettings(result);
      return result;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnKey: ColumnKey) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetKey: ColumnKey) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null);
      return;
    }

    // Не позволяем перемещать колонку 'actions'
    if (draggedColumn === 'actions' || targetKey === 'actions') {
      setDraggedColumn(null);
      return;
    }

    setSelectedColumns((prev) => {
      const newColumns = [...prev];
      const draggedIndex = newColumns.indexOf(draggedColumn);
      const targetIndex = newColumns.indexOf(targetKey);

      if (draggedIndex === -1 || targetIndex === -1) {
        return prev;
      }

      // Remove dragged item and insert at target position
      newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedColumn);

      // Убеждаемся, что 'actions' всегда в конце
      const actionsIndex = newColumns.indexOf('actions');
      if (actionsIndex !== -1 && actionsIndex !== newColumns.length - 1) {
        newColumns.splice(actionsIndex, 1);
        newColumns.push('actions');
      }

      saveColumnSettings(newColumns);
      return newColumns;
    });

    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const moveColumn = (columnKey: ColumnKey, direction: 'up' | 'down') => {
    // Не позволяем перемещать колонку 'actions'
    if (columnKey === 'actions') return;

    setSelectedColumns((prev) => {
      const index = prev.indexOf(columnKey);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;

      // Не позволяем перемещать колонку ниже 'actions'
      const actionsIndex = prev.indexOf('actions');
      if (direction === 'down' && index === actionsIndex - 1) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newColumns = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      // Не позволяем перемещать колонку на позицию 'actions'
      if (newColumns[newIndex] === 'actions') return prev;

      [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];

      saveColumnSettings(newColumns);
      return newColumns;
    });
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`${API_URL}/admin/catalog/suppliers?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [search, getAuthHeaders]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Получаем видимые колонки в сохраненном порядке
  const getVisibleColumns = useCallback((): ColumnKey[] => {
    return selectedColumns;
  }, [selectedColumns]);

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, supplier: null });
    setDeleteError(null);
  };

  const handleDeleteSupplier = async () => {
    if (!deleteModal.supplier) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(
        `${API_URL}/admin/catalog/suppliers/${deleteModal.supplier.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        closeDeleteModal();
        fetchSuppliers();
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.message || 'Ошибка при удалении поставщика');
      }
    } catch (error) {
      setDeleteError('Ошибка сети при удалении поставщика');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Загрузка поставщиков...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Поставщики</h1>
        <div className={styles.headerActions}>
          <div className={styles.columnSelectorWrapper} ref={columnSelectorRef}>
            <button
              className={`${styles.secondaryButton} ${showColumnSelector ? styles.active : ''}`}
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              title="Настройка колонок"
            >
              ⚙️ Колонки
            </button>
            {showColumnSelector && (
              <div className={styles.columnSelectorDropdown}>
                <div className={styles.columnSelectorHeader}>
                  <span>Выберите и упорядочьте колонки:</span>
                </div>
                <div className={styles.columnsList}>
                  {/* Selected columns - can be reordered */}
                  {selectedColumns.length > 0 && (
                    <div className={styles.selectedColumnsSection}>
                      <div className={styles.sectionLabel}>
                        Отображаемые (перетащите для сортировки):
                      </div>
                      {selectedColumns.map((colKey, index) => {
                        const col = allColumns[colKey];
                        if (!col) return null;
                        return (
                          <div
                            key={colKey}
                            className={`${styles.columnItem} ${styles.selected} ${draggedColumn === colKey ? styles.dragging : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, colKey)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, colKey)}
                            onDragEnd={handleDragEnd}
                          >
                            <span className={styles.dragHandle}>⋮⋮</span>
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={() => toggleColumn(colKey)}
                              onClick={(e) => e.stopPropagation()}
                              disabled={colKey === 'actions'}
                            />
                            <span className={styles.columnTitle}>{col.label}</span>
                            {colKey === 'actions' && (
                              <span className={styles.disabledHint}>(обязательно)</span>
                            )}
                            <div className={styles.columnOrderButtons}>
                              <button
                                className={styles.orderButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveColumn(colKey, 'up');
                                }}
                                disabled={index === 0 || colKey === 'actions'}
                                title="Переместить вверх"
                              >
                                ↑
                              </button>
                              <button
                                className={styles.orderButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveColumn(colKey, 'down');
                                }}
                                disabled={
                                  index === selectedColumns.length - 1 || colKey === 'actions'
                                }
                                title="Переместить вниз"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Available columns - not selected */}
                  {Object.keys(allColumns).filter(
                    (key) => !selectedColumns.includes(key as ColumnKey) && key !== 'actions'
                  ).length > 0 && (
                    <div className={styles.availableColumnsSection}>
                      <div className={styles.sectionLabel}>Доступные колонки:</div>
                      {Object.keys(allColumns)
                        .filter(
                          (key) => !selectedColumns.includes(key as ColumnKey) && key !== 'actions'
                        )
                        .map((key) => {
                          const col = allColumns[key as ColumnKey];
                          return (
                            <div key={key} className={styles.columnItem}>
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={() => toggleColumn(key as ColumnKey)}
                              />
                              <span className={styles.columnTitle}>{col.label}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className={styles.addButton}
            onClick={() => router.push('/admin/catalog/suppliers/new')}
          >
            + Добавить поставщика
          </button>
        </div>
      </div>

      <div className={styles.searchSection}>
        <input
          type="text"
          placeholder="Поиск по наименованию, ИНН..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {suppliers.length === 0 ? (
        <div className={styles.empty}>
          <p>Поставщики не найдены</p>
          <button
            className={styles.addButton}
            onClick={() => router.push('/admin/catalog/suppliers/new')}
          >
            Добавить первого поставщика
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {getVisibleColumns().map((columnKey) => (
                  <th key={columnKey}>{allColumns[columnKey].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  {getVisibleColumns().map((columnKey) => (
                    <td key={columnKey}>{allColumns[columnKey].render(supplier)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно удаления */}
      {deleteModal.isOpen && deleteModal.supplier && (
        <div className={styles.modalOverlay} onClick={closeDeleteModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Удаление поставщика</h2>
              <button className={styles.modalClose} onClick={closeDeleteModal}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.warningBox}>
                <p className={styles.warningText}>Вы уверены, что хотите удалить поставщика?</p>
                <p className={styles.supplierToDelete}>{deleteModal.supplier.legalName}</p>
                {deleteModal.supplier._count && deleteModal.supplier._count.products > 0 && (
                  <p className={styles.warningSubtext}>
                    Внимание: у этого поставщика есть {deleteModal.supplier._count.products}{' '}
                    связанных товаров.
                  </p>
                )}
              </div>
              {deleteError && <div className={styles.errorMessage}>{deleteError}</div>}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className={styles.dangerButton}
                onClick={handleDeleteSupplier}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
