'use client';

import { useMemo } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { getSafeHref } from '@/shared/lib/sanitize';

import styles from './SuppliersPage.module.css';
import type { SuppliersPageModel } from './hooks/useSuppliersPage';
import { COLUMN_META } from './suppliers-page.constants';
import type { ColumnDefinition, ColumnKey } from './suppliers-page.types';
import { formatPhone } from './suppliers-page.utils';

type SuppliersPageViewProps = {
  model: SuppliersPageModel;
};

export function SuppliersPageView({ model }: SuppliersPageViewProps) {
  const router = useRouter();
  const {
    suppliers,
    loading,
    search,
    setSearch,
    deleteModal,
    deleting,
    deleteError,
    showColumnSelector,
    setShowColumnSelector,
    columnSelectorRef,
    draggedColumn,
    selectedColumns,
    openDeleteModal,
    toggleColumn,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    moveColumn,
    closeDeleteModal,
    handleDeleteSupplier,
  } = model;

  const allColumns = useMemo<Record<ColumnKey, ColumnDefinition>>(
    () => ({
      legalName: {
        key: 'legalName',
        label: COLUMN_META.legalName.label,
        defaultVisible: COLUMN_META.legalName.defaultVisible,
        render: (supplier) => <div className={styles.supplierName}>{supplier.legalName}</div>,
      },
      commercialName: {
        key: 'commercialName',
        label: COLUMN_META.commercialName.label,
        defaultVisible: COLUMN_META.commercialName.defaultVisible,
        render: (supplier) => (
          <div className={styles.supplierName}>{supplier.commercialName || '-'}</div>
        ),
      },
      inn: {
        key: 'inn',
        label: COLUMN_META.inn.label,
        defaultVisible: COLUMN_META.inn.defaultVisible,
        render: (supplier) =>
          supplier.inn ? (
            <span className={styles.innValue}>{supplier.inn}</span>
          ) : (
            <span className={styles.emptyValue}>-</span>
          ),
      },
      phone: {
        key: 'phone',
        label: COLUMN_META.phone.label,
        defaultVisible: COLUMN_META.phone.defaultVisible,
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
        label: COLUMN_META.email.label,
        defaultVisible: COLUMN_META.email.defaultVisible,
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
        label: COLUMN_META.website.label,
        defaultVisible: COLUMN_META.website.defaultVisible,
        render: (supplier) =>
          supplier.website ? (
            <a
              href={getSafeHref(supplier.website)}
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
        label: COLUMN_META.legalAddress.label,
        defaultVisible: COLUMN_META.legalAddress.defaultVisible,
        render: (supplier) => (
          <span className={styles.textValue}>{supplier.legalAddress || '-'}</span>
        ),
      },
      bankName: {
        key: 'bankName',
        label: COLUMN_META.bankName.label,
        defaultVisible: COLUMN_META.bankName.defaultVisible,
        render: (supplier) => <span className={styles.textValue}>{supplier.bankName || '-'}</span>,
      },
      bankAccount: {
        key: 'bankAccount',
        label: COLUMN_META.bankAccount.label,
        defaultVisible: COLUMN_META.bankAccount.defaultVisible,
        render: (supplier) => (
          <span className={styles.textValue}>{supplier.bankAccount || '-'}</span>
        ),
      },
      bankBik: {
        key: 'bankBik',
        label: COLUMN_META.bankBik.label,
        defaultVisible: COLUMN_META.bankBik.defaultVisible,
        render: (supplier) => <span className={styles.textValue}>{supplier.bankBik || '-'}</span>,
      },
      productsCount: {
        key: 'productsCount',
        label: COLUMN_META.productsCount.label,
        defaultVisible: COLUMN_META.productsCount.defaultVisible,
        render: (supplier) => (
          <span className={styles.productCount}>{supplier._count?.products || 0}</span>
        ),
      },
      isActive: {
        key: 'isActive',
        label: COLUMN_META.isActive.label,
        defaultVisible: COLUMN_META.isActive.defaultVisible,
        render: (supplier) =>
          supplier.isActive ? (
            <span className={styles.activeBadge}>Активен</span>
          ) : (
            <span className={styles.inactiveBadge}>Неактивен</span>
          ),
      },
      actions: {
        key: 'actions',
        label: COLUMN_META.actions.label,
        defaultVisible: COLUMN_META.actions.defaultVisible,
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
              data-admin-mutation
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
    [router, openDeleteModal]
  );

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
            data-admin-mutation
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
            data-admin-mutation
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
                {selectedColumns.map((columnKey) => (
                  <th key={columnKey}>{allColumns[columnKey].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  {selectedColumns.map((columnKey) => (
                    <td key={columnKey}>{allColumns[columnKey].render(supplier)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                data-admin-mutation
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
