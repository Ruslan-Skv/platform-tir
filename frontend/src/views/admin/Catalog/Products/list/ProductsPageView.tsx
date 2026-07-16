'use client';

import { useAdminResourcePermission } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { apiFetch } from '@/shared/lib/api-fetch';
import {
  formatSupplierPriceUpdateMessage,
  getSupplierPriceErrorLabel,
  getSupplierPriceSyncError,
} from '@/shared/lib/catalog/supplier-price-update-message';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import styles from './ProductsPage.module.css';
import type { ProductsPageModel } from './hooks/useProductsPage';
import {
  API_URL,
  AVAILABLE_COLUMNS,
  type ColumnConfig,
  type Product,
  formatDate,
} from './products-page.constants';

const CATALOG_PRODUCTS_RESOURCE = 'admin.catalog.products';

type ProductsPageViewProps = {
  model: ProductsPageModel;
};

export function ProductsPageView({ model }: ProductsPageViewProps) {
  const { canEdit } = useAdminResourcePermission(CATALOG_PRODUCTS_RESOURCE);
  const {
    categoryId,
    router,
    suppliers,
    searchQuery,
    searchHistoryListId,
    categoryFilter,
    setCategoryFilter,
    sortStorageKey,
    listSortBy,
    listSortOrder,
    handleListSortChange,
    stockFilter,
    setStockFilter,
    authorFilter,
    setAuthorFilter,
    selectedIds,
    setSelectedIds,
    hasSelection,
    page,
    setPage,
    limit,
    setLimit,
    activeFilter,
    setActiveFilter,
    featuredFilter,
    setFeaturedFilter,
    newFilter,
    setNewFilter,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    showAdvancedFilters,
    setShowAdvancedFilters,
    editMode,
    setEditMode,
    selectedColumns,
    showColumnSelector,
    setShowColumnSelector,
    editedProducts,
    savingEdits,
    saveMessage,
    setSaveMessage,
    saveMessageType,
    showImportModal,
    setShowImportModal,
    importFile,
    setImportFile,
    importCategoryId,
    setImportCategoryId,
    importSkuPrefix,
    setImportSkuPrefix,
    importing,
    importResult,
    showStroykomHandlesImport,
    stroykomConfirmOpen,
    setStroykomConfirmOpen,
    stroykomJob,
    stroykomStarting,
    stroykomError,
    startStroykomImport,
    closeStroykomProgress,
    fileInputRef,
    columnSelectorRef,
    showExportModal,
    setShowExportModal,
    exporting,
    showDeleteConfirmModal,
    setShowDeleteConfirmModal,
    deleting,
    updatingSupplierPrices,
    setUpdatingSupplierPrices,
    syncingSupplierPrices,
    setSyncingSupplierPrices,
    syncSupplierPricesMessage,
    setSyncSupplierPricesMessage,
    selectionHintMessage,
    setSelectionHintMessage,
    priceChangedIds,
    setPriceChangedIds,
    syncSupplierPricesMessageType,
    setSyncSupplierPricesMessageType,
    persistedCategoryId,
    currentCategoryName,
    totalProducts,
    listProducts,
    loading,
    refreshing,
    refetchProductsList,
    categoryAttributes,
    flatCategories,
    authorOptions,
    visibleRecentSearches,
    showSearchHistory,
    hasAdvancedFilters,
    totalEditsCount,
    draggedColumn,
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlurWithSave,
    handleSearchKeyDown,
    pickRecentSearch,
    cancelSearchBlurClose,
    resetAdvancedFilters,
    formatCurrency,
    bulkToggleActive,
    performBulkDelete,
    handleImport,
    resetImportModal,
    exportToCSV,
    exportToExcel,
    toggleColumn,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    moveColumn,
    handleInlineEdit,
    getCurrentValue,
    hasEdits,
    saveAllEdits,
    cancelEdits,
    navigateToProductEdit,
    showSelectionHint,
    getAuthHeaders,
    setEditedProducts,
    invalidateProductsList,
  } = model;

  // Render editable cell based on column type
  const renderEditableCell = (product: Product, columnConfig: ColumnConfig) => {
    const currentValue = getCurrentValue(product, columnConfig.key);
    const isEdited = editedProducts[product.id]?.[columnConfig.key] !== undefined;

    // Special handling for supplier field
    if (columnConfig.key === 'supplier') {
      return (
        <select
          className={`${styles.editableInput} ${styles.editableSelect} ${isEdited ? styles.edited : ''}`}
          value={(currentValue as string) || ''}
          onChange={(e) => {
            e.stopPropagation();
            handleInlineEdit(product.id, columnConfig.key, e.target.value || null);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Не выбран</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.commercialName || supplier.legalName}
            </option>
          ))}
        </select>
      );
    }

    if (columnConfig.type === 'boolean') {
      return (
        <label className={styles.editableCheckbox}>
          <input
            type="checkbox"
            checked={currentValue as boolean}
            onChange={(e) => {
              e.stopPropagation();
              handleInlineEdit(product.id, columnConfig.key, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className={`${styles.checkboxLabel} ${isEdited ? styles.edited : ''}`}>
            {currentValue ? 'Да' : 'Нет'}
          </span>
        </label>
      );
    }

    if (columnConfig.type === 'currency' || columnConfig.type === 'number') {
      const numericValue =
        currentValue === null || currentValue === undefined
          ? ''
          : typeof currentValue === 'number'
            ? currentValue
            : '';
      return (
        <input
          type="number"
          className={`${styles.editableInput} ${isEdited ? styles.edited : ''}`}
          value={numericValue}
          onChange={(e) => {
            e.stopPropagation();
            const val = e.target.value === '' ? null : parseFloat(e.target.value);
            handleInlineEdit(product.id, columnConfig.key, val);
          }}
          onClick={(e) => e.stopPropagation()}
          step={columnConfig.type === 'currency' ? '0.01' : '1'}
          min="0"
        />
      );
    }

    return (
      <input
        type="text"
        className={`${styles.editableInput} ${isEdited ? styles.edited : ''}`}
        value={(currentValue as string) || ''}
        onChange={(e) => {
          e.stopPropagation();
          handleInlineEdit(product.id, columnConfig.key, e.target.value);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  };

  // Build columns dynamically
  const baseColumns = [
    {
      key: 'product',
      title: 'Товар',
      sortable: true,
      sortKey: 'name',
      render: (product: Product) => (
        <div className={styles.productCell}>
          <div className={styles.productImage}>
            {product.images[0] ? (
              <img src={product.images[0]} alt={product.name} />
            ) : (
              <span className={styles.noImage}>📦</span>
            )}
          </div>
          <div className={styles.productInfo}>
            <span className={styles.productName}>{product.name}</span>
            <span className={styles.productSku}>{product.sku}</span>
          </div>
        </div>
      ),
    },
    // Колонка «Категория» скрыта при просмотре по категории — все товары в одной категории
    ...(categoryId
      ? []
      : [
          {
            key: 'category',
            title: 'Категория',
            sortable: true,
            sortKey: 'category.name',
            render: (product: Product) => product.category.name,
          },
        ]),
  ];

  // Generate dynamic columns based on selection and edit mode
  const dynamicColumns = selectedColumns
    .map((columnKey) => {
      // Проверяем, это атрибут или обычная колонка
      const isAttribute = columnKey.startsWith('attr:');
      if (isAttribute) {
        const attrSlug = columnKey.replace('attr:', '');
        const attr = categoryAttributes.find((a) => a.slug === attrSlug);
        if (!attr) return null;

        return {
          key: columnKey,
          title: attr.name,
          sortable: false,
          render: (product: Product) => {
            const attrValue = product.attributes?.[attrSlug];
            if (attrValue === undefined || attrValue === null) {
              return <span className={styles.emptyValue}>—</span>;
            }
            if (Array.isArray(attrValue)) {
              return <span>{attrValue.join(', ')}</span>;
            }
            return <span>{String(attrValue)}</span>;
          },
        };
      }

      const columnConfig = AVAILABLE_COLUMNS.find((c) => c.key === columnKey);
      if (!columnConfig) return null;

      return {
        key: columnConfig.key,
        title: columnConfig.title,
        sortable:
          columnConfig.type === 'number' ||
          columnConfig.type === 'currency' ||
          columnConfig.type === 'boolean' ||
          columnConfig.type === 'date',
        render: (product: Product) => {
          // В режиме быстрого редактирования редактируем только выбранные товары
          if (editMode && columnConfig.editable && selectedIds.includes(product.id)) {
            return renderEditableCell(product, columnConfig);
          }

          // Non-edit mode rendering
          // Special handling for supplier field
          if (columnConfig.key === 'supplier') {
            const mainSupplier = product.suppliers?.find((s) => s.isMainSupplier);
            if (!mainSupplier) {
              return <span className={styles.emptyValue}>—</span>;
            }
            return (
              <span>{mainSupplier.supplier.commercialName || mainSupplier.supplier.legalName}</span>
            );
          }

          // Артикул товара поставщика — из главного поставщика
          if (columnConfig.key === 'supplierSku') {
            const mainSupplier = product.suppliers?.find((s) => s.isMainSupplier);
            const sku = mainSupplier?.supplierSku?.trim();
            if (!sku) {
              return <span className={styles.emptyValue}>—</span>;
            }
            return <span>{sku}</span>;
          }

          // Цена поставщика + пометка «изменилась»
          if (columnConfig.key === 'supplierPrice') {
            const mainSupplier = product.suppliers?.find((s) => s.isMainSupplier);
            const updateError = mainSupplier ? getSupplierPriceSyncError(mainSupplier) : null;
            if (!mainSupplier) {
              return <span className={styles.emptyValue}>—</span>;
            }
            const price = mainSupplier.supplierPrice;
            const changed = Boolean(mainSupplier.supplierPriceChangedAt);
            if ((price === undefined || price === null) && !updateError) {
              return <span className={styles.emptyValue}>—</span>;
            }
            const num = typeof price === 'string' ? parseFloat(price) : Number(price);
            return (
              <span className={styles.supplierPriceCell}>
                {price !== undefined && price !== null && !Number.isNaN(num) && (
                  <span className={styles.price}>{formatCurrency(num)}</span>
                )}
                {updateError && (
                  <span
                    className={styles.supplierPriceErrorBadge}
                    title={getSupplierPriceErrorLabel(updateError)}
                  >
                    ×
                  </span>
                )}
                {changed && (
                  <span
                    className={styles.supplierPriceChangedBadge}
                    title="Цена поставщика изменилась"
                  >
                    !
                  </span>
                )}
              </span>
            );
          }

          if (columnConfig.key === 'createdBy') {
            const author = product.createdBy;
            if (!author) {
              return <span className={styles.emptyValue}>—</span>;
            }
            const name = `${author.firstName || ''} ${author.lastName || ''}`.trim();
            const main = name || author.email;
            return <span title={author.email}>{main}</span>;
          }

          const value = product[columnConfig.key as keyof Product];

          if (columnConfig.type === 'currency') {
            return <span className={styles.price}>{formatCurrency(value as number)}</span>;
          }

          if (columnConfig.type === 'number') {
            const numValue = value as number;
            // Для колонки "Сортировка" не добавляем единицы измерения
            if (columnConfig.key === 'sortOrder') {
              return <span>{numValue}</span>;
            }
            // Для остальных числовых колонок (например, "Остаток") добавляем "шт."
            return (
              <span
                className={`${styles.stock} ${
                  numValue === 0 ? styles.stockOut : numValue <= 5 ? styles.stockLow : ''
                }`}
              >
                {numValue} шт.
              </span>
            );
          }

          if (columnConfig.type === 'boolean') {
            return (
              <span className={`${styles.statusBadge} ${value ? styles.active : styles.inactive}`}>
                {value ? 'Да' : 'Нет'}
              </span>
            );
          }

          if (columnConfig.type === 'date') {
            return <span>{formatDate(value)}</span>;
          }

          return <span>{String(value)}</span>;
        },
      };
    })
    .filter((col): col is NonNullable<typeof col> => col !== null);

  const actionColumn = canEdit
    ? {
        key: 'actions',
        title: '',
        width: '60px',
        render: (product: Product) => (
          <div className={styles.actions}>
            {editMode && hasEdits(product.id) && (
              <span className={styles.editedIndicator} title="Есть изменения">
                ●
              </span>
            )}
            <AdminTableIconButton
              onClick={(e) => {
                e.stopPropagation();
                navigateToProductEdit(product.id);
              }}
              title="Редактировать"
              aria-label="Редактировать товар"
            >
              <EditIcon />
            </AdminTableIconButton>
            <AdminTableIconButton
              onClick={(e) => {
                e.stopPropagation();
                const copyUrl = `/admin/catalog/products/new?copyFrom=${product.id}${
                  persistedCategoryId ? `&fromCategory=${persistedCategoryId}` : ''
                }`;
                router.push(copyUrl);
              }}
              title="Копировать товар"
              aria-label="Копировать товар"
            >
              <CopyIcon />
            </AdminTableIconButton>
          </div>
        ),
      }
    : null;

  const columns = [...baseColumns, ...dynamicColumns, ...(actionColumn ? [actionColumn] : [])];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            {currentCategoryName ? `Товары: ${currentCategoryName}` : 'Товары'}
          </h1>
          <span className={styles.count}>{totalProducts} товаров</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.columnSelectorWrapper} ref={columnSelectorRef}>
            <button
              className={`${styles.secondaryButton} ${showColumnSelector ? styles.active : ''}`}
              onClick={() => setShowColumnSelector(!showColumnSelector)}
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
                        // Проверяем, это атрибут или обычная колонка
                        const isAttribute = colKey.startsWith('attr:');
                        const col = isAttribute
                          ? null
                          : AVAILABLE_COLUMNS.find((c) => c.key === colKey);
                        const attr = isAttribute
                          ? categoryAttributes.find((a) => a.slug === colKey.replace('attr:', ''))
                          : null;
                        if (!col && !attr) return null;
                        const title = col ? col.title : attr?.name || colKey;
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
                            />
                            <span className={styles.columnTitle}>{title}</span>
                            <div className={styles.columnOrderButtons}>
                              <button
                                className={styles.orderButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveColumn(colKey, 'up');
                                }}
                                disabled={index === 0}
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
                                disabled={index === selectedColumns.length - 1}
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
                  {AVAILABLE_COLUMNS.filter((col) => !selectedColumns.includes(col.key)).length >
                    0 && (
                    <div className={styles.availableColumnsSection}>
                      <div className={styles.sectionLabel}>Доступные колонки:</div>
                      {AVAILABLE_COLUMNS.filter((col) => !selectedColumns.includes(col.key)).map(
                        (col) => (
                          <div key={col.key} className={styles.columnItem}>
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => toggleColumn(col.key)}
                            />
                            <span className={styles.columnTitle}>{col.title}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  {/* Available attributes - not selected */}
                  {categoryAttributes.filter(
                    (attr) => !selectedColumns.includes(`attr:${attr.slug}`)
                  ).length > 0 && (
                    <div className={styles.availableColumnsSection}>
                      <div className={styles.sectionLabel}>Атрибуты категорий:</div>
                      {categoryAttributes
                        .filter((attr) => !selectedColumns.includes(`attr:${attr.slug}`))
                        .map((attr) => (
                          <div key={`attr:${attr.slug}`} className={styles.columnItem}>
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => toggleColumn(`attr:${attr.slug}`)}
                            />
                            <span className={styles.columnTitle}>{attr.name}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {canEdit ? (
            <>
              <button
                className={`${styles.secondaryButton} ${!editMode && !hasSelection ? styles.secondaryButtonDisabled : ''} ${editMode ? styles.editModeActive : ''}`}
                title={!editMode && !hasSelection ? 'Сначала выберите товары в таблице' : undefined}
                onClick={() => {
                  if (!editMode && !hasSelection) {
                    showSelectionHint();
                    return;
                  }
                  if (editMode && totalEditsCount > 0) {
                    if (confirm('Есть несохранённые изменения. Выйти без сохранения?')) {
                      cancelEdits();
                    }
                  } else {
                    setEditMode(!editMode);
                    setEditedProducts({});
                  }
                }}
              >
                {editMode ? '✕ Выйти из редактирования' : '✏️ Быстрое редактирование'}
              </button>

              <button className={styles.secondaryButton} onClick={() => setShowImportModal(true)}>
                📥 Импорт
              </button>
              {showStroykomHandlesImport ? (
                <button
                  type="button"
                  data-admin-mutation
                  className={styles.secondaryButton}
                  onClick={() => setStroykomConfirmOpen(true)}
                  disabled={Boolean(
                    stroykomJob &&
                    (stroykomJob.status === 'running' || stroykomJob.status === 'pending')
                  )}
                  title="Скопировать ручки с сайта поставщика Стройком (436830.ru)"
                >
                  Импорт с сайта Стройком
                </button>
              ) : null}
              <button
                className={`${styles.secondaryButton} ${!hasSelection ? styles.secondaryButtonDisabled : ''}`}
                title={!hasSelection ? 'Сначала выберите товары в таблице' : undefined}
                onClick={() => {
                  if (!hasSelection) {
                    showSelectionHint();
                    return;
                  }
                  setShowExportModal(true);
                }}
              >
                📤 Экспорт
              </button>
              <button
                className={`${styles.secondaryButton} ${!hasSelection ? styles.secondaryButtonDisabled : ''}`}
                title={
                  !hasSelection
                    ? 'Сначала выберите товары в таблице'
                    : 'Для выбранных товаров с ссылкой на товар поставщика получить актуальную цену. Строки с изменившейся ценой подсветятся.'
                }
                onClick={async () => {
                  if (!hasSelection) {
                    showSelectionHint();
                    return;
                  }
                  setUpdatingSupplierPrices(true);
                  setSyncSupplierPricesMessage(null);
                  try {
                    const response = await apiFetch(
                      `${API_URL}/products/admin/update-supplier-prices`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...getAuthHeaders(),
                        },
                        body: JSON.stringify({ productIds: selectedIds }),
                      }
                    );
                    if (!response.ok) {
                      const err = await response.json().catch(() => ({}));
                      throw new Error(err.message || 'Ошибка обновления цен');
                    }
                    const data = await response.json();
                    setPriceChangedIds(data.changedIds ?? []);
                    const msg = formatSupplierPriceUpdateMessage(data);
                    const hasErrors = (data.errors?.length ?? 0) > 0;
                    const allFailed = hasErrors && data.updated === 0;
                    setSyncSupplierPricesMessageType(
                      allFailed ? 'error' : hasErrors ? 'warning' : 'success'
                    );
                    setSyncSupplierPricesMessage(msg);
                    setTimeout(() => setSyncSupplierPricesMessage(null), hasErrors ? 8000 : 5000);
                    invalidateProductsList();
                  } catch (e) {
                    setSyncSupplierPricesMessageType('error');
                    setSyncSupplierPricesMessage(
                      e instanceof Error ? e.message : 'Ошибка обновления цен поставщика'
                    );
                    setTimeout(() => setSyncSupplierPricesMessage(null), 5000);
                  } finally {
                    setUpdatingSupplierPrices(false);
                  }
                }}
              >
                {updatingSupplierPrices ? '⏳ Обновление...' : '📡 Обновить цены'}
              </button>
              <button
                className={`${styles.secondaryButton} ${!hasSelection ? styles.secondaryButtonDisabled : ''}`}
                title={
                  !hasSelection
                    ? 'Сначала выберите товары в таблице'
                    : 'Установить цену товара равной цене поставщика для выбранных товаров'
                }
                onClick={async () => {
                  if (!hasSelection) {
                    showSelectionHint();
                    return;
                  }
                  setSyncingSupplierPrices(true);
                  setSyncSupplierPricesMessage(null);
                  try {
                    const response = await apiFetch(
                      `${API_URL}/products/admin/apply-supplier-prices`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...getAuthHeaders(),
                        },
                        body: JSON.stringify({ productIds: selectedIds }),
                      }
                    );
                    if (!response.ok) {
                      const err = await response.json().catch(() => ({}));
                      throw new Error(err.message || 'Ошибка синхронизации');
                    }
                    const data = await response.json();
                    setPriceChangedIds((prev) =>
                      prev.filter((id) => !(data.syncedIds ?? []).includes(id))
                    );
                    const msg =
                      data.total === 0
                        ? 'Среди выбранных нет товаров с поставщиком'
                        : `Синхронизировано: ${data.synced} из ${data.total}` +
                          (data.errors?.length ? `, ошибок: ${data.errors.length}` : '');
                    setSyncSupplierPricesMessage(msg);
                    setTimeout(() => setSyncSupplierPricesMessage(null), 5000);
                    invalidateProductsList();
                  } catch (e) {
                    setSyncSupplierPricesMessage(
                      e instanceof Error ? e.message : 'Ошибка синхронизации цен'
                    );
                    setTimeout(() => setSyncSupplierPricesMessage(null), 5000);
                  } finally {
                    setSyncingSupplierPrices(false);
                  }
                }}
              >
                {syncingSupplierPrices ? '⏳ Синхронизация...' : '🔄 Синхр. цены'}
              </button>
              <button
                data-admin-mutation
                type="button"
                className={styles.addButton}
                onClick={() => {
                  const url = persistedCategoryId
                    ? `/admin/catalog/products/new?categoryId=${persistedCategoryId}&fromCategory=${persistedCategoryId}`
                    : '/admin/catalog/products/new';
                  router.push(url);
                }}
              >
                + Новый товар
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchField}>
          <input
            type="search"
            placeholder="Поиск по названию, артикулу..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlurWithSave}
            onKeyDown={handleSearchKeyDown}
            className={styles.searchInput}
            autoComplete="off"
            aria-expanded={showSearchHistory}
            aria-controls={showSearchHistory ? searchHistoryListId : undefined}
            aria-autocomplete="list"
          />
          {showSearchHistory && (
            <ul
              id={searchHistoryListId}
              className={styles.searchHistoryList}
              role="listbox"
              aria-label="Недавние поиски"
              onMouseDown={cancelSearchBlurClose}
            >
              <li className={styles.searchHistoryHeader} role="presentation">
                Недавние поиски
              </li>
              {visibleRecentSearches.map((query) => (
                <li key={query} role="presentation">
                  <button
                    type="button"
                    role="option"
                    className={styles.searchHistoryItem}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickRecentSearch(query)}
                  >
                    {query}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className={styles.select}
        >
          <option value="">Все категории</option>
          {flatCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => {
            setStockFilter(e.target.value);
            setPage(1);
          }}
          className={styles.select}
        >
          <option value="">Все остатки</option>
          <option value="in-stock">В наличии</option>
          <option value="low-stock">Мало</option>
          <option value="out-of-stock">Нет в наличии</option>
        </select>
        <select
          value={authorFilter}
          onChange={(e) => {
            setAuthorFilter(e.target.value);
            setPage(1);
          }}
          className={styles.select}
          title="Фильтр по автору карточки"
          aria-label="Автор карточки"
        >
          <option value="">Все авторы</option>
          <option value="__none__">Без автора</option>
          {authorOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className={styles.select}
        >
          <option value={20}>20 на странице</option>
          <option value={50}>50 на странице</option>
          <option value={100}>100 на странице</option>
          <option value={200}>200 на странице</option>
        </select>
        <button
          className={`${styles.filterToggleButton} ${showAdvancedFilters ? styles.active : ''} ${hasAdvancedFilters ? styles.hasFilters : ''}`}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          🔍 Фильтры{' '}
          {hasAdvancedFilters &&
            `(${[activeFilter !== 'all', featuredFilter !== 'all', newFilter !== 'all', priceMin !== '', priceMax !== ''].filter(Boolean).length})`}
        </button>
        <button
          className={styles.refreshButton}
          onClick={() => void refetchProductsList()}
          disabled={loading || refreshing}
        >
          🔄 {refreshing ? 'Обновление...' : loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className={styles.advancedFilters}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label>Статус</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'yes' | 'no')}
                className={styles.filterSelect}
              >
                <option value="all">Все</option>
                <option value="yes">Активные</option>
                <option value="no">Неактивные</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Хит продаж</label>
              <select
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value as 'all' | 'yes' | 'no')}
                className={styles.filterSelect}
              >
                <option value="all">Все</option>
                <option value="yes">Да</option>
                <option value="no">Нет</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Новинка</label>
              <select
                value={newFilter}
                onChange={(e) => setNewFilter(e.target.value as 'all' | 'yes' | 'no')}
                className={styles.filterSelect}
              >
                <option value="all">Все</option>
                <option value="yes">Да</option>
                <option value="no">Нет</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Цена от</label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                className={styles.filterInput}
                min="0"
              />
            </div>

            <div className={styles.filterGroup}>
              <label>Цена до</label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="∞"
                className={styles.filterInput}
                min="0"
              />
            </div>

            {hasAdvancedFilters && (
              <button className={styles.resetFiltersButton} onClick={resetAdvancedFilters}>
                ✕ Сбросить фильтры
              </button>
            )}
          </div>
        </div>
      )}

      {canEdit && hasSelection && !editMode && (
        <div className={styles.bulkActions}>
          <span>Выбрано: {selectedIds.length}</span>
          <button className={styles.bulkButton} onClick={() => bulkToggleActive(true)}>
            ✓ Активировать
          </button>
          <button className={styles.bulkButton} onClick={() => bulkToggleActive(false)}>
            ✗ Деактивировать
          </button>
          <button
            data-admin-mutation
            className={`${styles.bulkButton} ${styles.danger}`}
            onClick={() => setShowDeleteConfirmModal(true)}
          >
            🗑️ Удалить
          </button>
        </div>
      )}

      {/* Edit mode save bar */}
      {canEdit && editMode && (
        <div className={styles.editModeBar}>
          <div className={styles.editModeInfo}>
            <span className={styles.editModeIcon}>✏️</span>
            <span>Режим быстрого редактирования</span>
            {totalEditsCount > 0 && (
              <span className={styles.editCount}>
                Изменено товаров: <strong>{totalEditsCount}</strong>
              </span>
            )}
          </div>
          <div className={styles.editModeActions}>
            <button className={styles.cancelButton} onClick={cancelEdits} disabled={savingEdits}>
              Отмена
            </button>
            <button
              data-admin-mutation
              className={styles.saveButton}
              onClick={saveAllEdits}
              disabled={savingEdits || totalEditsCount === 0}
            >
              {savingEdits ? 'Сохранение...' : `Сохранить изменения (${totalEditsCount})`}
            </button>
          </div>
        </div>
      )}

      <DataTable
        paginationClassName={styles.productsPagination}
        paginationActiveClassName={styles.paginationPageActive}
        data={listProducts}
        columns={columns}
        keyExtractor={(product) => product.id}
        defaultSortBy="name"
        defaultSortOrder="asc"
        sortStorageKey={sortStorageKey}
        serverSideSort
        serverSidePagination
        controlledSortBy={listSortBy}
        controlledSortOrder={listSortOrder}
        onSortChange={handleListSortChange}
        onRowClick={(product) => {
          navigateToProductEdit(product.id);
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        highlightedIds={priceChangedIds}
        highlightedRowClassName={styles.priceChangedRow}
        getRowClassName={(product) => (!product.isActive ? styles.inactiveProductRow : undefined)}
        loading={loading}
        emptyMessage="Товары не найдены"
        pagination={{
          page,
          limit,
          total: totalProducts,
          onPageChange: setPage,
        }}
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirmModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !deleting && setShowDeleteConfirmModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Подтверждение удаления</h3>
            <p className={styles.deleteConfirmText}>
              Удалить выбранные товары ({selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'товар' : selectedIds.length < 5 ? 'товара' : 'товаров'})?
              Это действие нельзя отменить.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                data-admin-mutation
                className={styles.dangerButton}
                onClick={performBulkDelete}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : '🗑️ Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={resetImportModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Импорт товаров</h3>

            {importResult ? (
              <div className={styles.importResult}>
                <div className={styles.resultStats}>
                  <div className={styles.resultItem}>
                    <span className={styles.resultNumber}>{importResult.totalFound}</span>
                    <span>Найдено</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={`${styles.resultNumber} ${styles.success}`}>
                      {importResult.created}
                    </span>
                    <span>Создано</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={`${styles.resultNumber} ${styles.info}`}>
                      {importResult.updated}
                    </span>
                    <span>Обновлено</span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className={styles.resultItem}>
                      <span className={`${styles.resultNumber} ${styles.error}`}>
                        {importResult.errors.length}
                      </span>
                      <span>Ошибок</span>
                    </div>
                  )}
                </div>

                {importResult.errors.length > 0 && (
                  <div className={styles.errorsList}>
                    <h4>Ошибки:</h4>
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <div key={i} className={styles.errorItem}>
                        <strong>{err.name}:</strong> {err.error}
                      </div>
                    ))}
                    {importResult.errors.length > 5 && (
                      <p className={styles.moreErrors}>
                        ...и ещё {importResult.errors.length - 5} ошибок
                      </p>
                    )}
                  </div>
                )}

                <div className={styles.modalActions}>
                  <button className={styles.primaryButton} onClick={resetImportModal}>
                    Закрыть
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label>Файл для импорта *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx,.html,.htm"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className={styles.fileInput}
                  />
                  <p className={styles.hint}>
                    Поддерживаются файлы .xls, .xlsx, .html (экспорт из Битрикс)
                  </p>
                </div>

                <div className={styles.formGroup}>
                  <label>Категория для импорта *</label>
                  <select
                    value={importCategoryId}
                    onChange={(e) => setImportCategoryId(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Выберите категорию</option>
                    {flatCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <p className={styles.hint}>
                    Для создания новой категории перейдите в{' '}
                    <a href="/admin/catalog/categories" className={styles.link}>
                      раздел Категории
                    </a>
                  </p>
                </div>

                <div className={styles.formGroup}>
                  <label>Префикс артикула</label>
                  <input
                    type="text"
                    value={importSkuPrefix}
                    onChange={(e) => setImportSkuPrefix(e.target.value.toUpperCase())}
                    placeholder="Например: ARGUS, DOORS, LOCK"
                    className={styles.input}
                  />
                  <p className={styles.hint}>Будет добавлен к артикулу каждого товара</p>
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.cancelButton} onClick={resetImportModal}>
                    Отмена
                  </button>
                  <button
                    className={styles.primaryButton}
                    onClick={handleImport}
                    disabled={importing || !importFile || !importCategoryId}
                  >
                    {importing ? 'Импорт...' : 'Импортировать'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Экспорт товаров</h3>

            <div className={styles.formGroup}>
              <label>Какие товары экспортировать?</label>
              <p className={styles.hint}>
                Будут экспортированы <strong>только выбранные</strong> товары ({selectedIds.length}{' '}
                шт.).
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Формат файла</label>
              <p className={styles.hint}>
                Выберите формат для скачивания. CSV подходит для импорта в другие системы, Excel —
                для просмотра и редактирования.
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
              >
                Отмена
              </button>
              <button className={styles.secondaryButton} onClick={exportToCSV} disabled={exporting}>
                {exporting ? 'Экспорт...' : '📄 Скачать CSV'}
              </button>
              <button className={styles.primaryButton} onClick={exportToExcel} disabled={exporting}>
                {exporting ? 'Экспорт...' : '📊 Скачать Excel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save result toast */}
      {saveMessage && (
        <div
          className={`${styles.toast} ${
            saveMessageType === 'success' ? styles.toastSuccess : styles.toastError
          }`}
        >
          <span className={styles.toastMessage}>{saveMessage}</span>
          <button
            className={styles.toastClose}
            onClick={() => setSaveMessage(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sync supplier prices toast */}
      {syncSupplierPricesMessage && (
        <div
          className={`${styles.toast} ${
            syncSupplierPricesMessageType === 'error'
              ? styles.toastError
              : syncSupplierPricesMessageType === 'warning'
                ? styles.toastWarning
                : styles.toastSuccess
          }`}
        >
          <span className={styles.toastMessage}>{syncSupplierPricesMessage}</span>
          <button
            className={styles.toastClose}
            onClick={() => setSyncSupplierPricesMessage(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selection required toast */}
      {selectionHintMessage && (
        <div className={`${styles.toast} ${styles.toastError}`}>
          <span className={styles.toastMessage}>{selectionHintMessage}</span>
          <button
            className={styles.toastClose}
            onClick={() => setSelectionHintMessage(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={stroykomConfirmOpen}
        title="Импорт с сайта Стройком?"
        message={
          stroykomError
            ? stroykomError
            : 'Будут созданы отдельные товары по каждой позиции ручек с 436830.ru (~154 шт.): название, цена, описание, фото, поставщик Стройком, ссылка на карточку, остаток 100. Уже импортированные (по ссылке на карточку поставщика) будут пропущены. Импорт займёт несколько минут.'
        }
        confirmText={stroykomStarting ? 'Запуск…' : 'Начать импорт'}
        cancelText="Отмена"
        variant="default"
        closeOnConfirm={false}
        onConfirm={() => {
          if (!stroykomStarting) void startStroykomImport();
        }}
        onClose={() => {
          if (!stroykomStarting) setStroykomConfirmOpen(false);
        }}
      />

      <Modal
        isOpen={Boolean(stroykomJob)}
        onClose={closeStroykomProgress}
        title="Импорт ручек Стройком"
        size="sm"
        showCloseButton={
          stroykomJob?.status === 'done' || stroykomJob?.status === 'error' || !stroykomJob
        }
      >
        {stroykomJob ? (
          <div className={styles.stroykomImportProgress}>
            <p>
              Статус:{' '}
              {stroykomJob.status === 'pending'
                ? 'Ожидание…'
                : stroykomJob.status === 'running'
                  ? 'Идёт импорт…'
                  : stroykomJob.status === 'done'
                    ? 'Готово'
                    : 'Ошибка'}
            </p>
            <p>
              Прогресс: {stroykomJob.done} / {stroykomJob.total || '…'}
            </p>
            <p>
              Создано: {stroykomJob.created}, пропущено: {stroykomJob.skipped}, ошибок:{' '}
              {stroykomJob.errors.length}
            </p>
            {stroykomJob.message ? <p>{stroykomJob.message}</p> : null}
            {stroykomError ? <p className={styles.stroykomImportError}>{stroykomError}</p> : null}
            {stroykomJob.errors.length > 0 ? (
              <ul className={styles.stroykomImportErrors}>
                {stroykomJob.errors.slice(0, 8).map((err) => (
                  <li key={err}>{err}</li>
                ))}
                {stroykomJob.errors.length > 8 ? (
                  <li>…и ещё {stroykomJob.errors.length - 8}</li>
                ) : null}
              </ul>
            ) : null}
            {(stroykomJob.status === 'done' || stroykomJob.status === 'error') && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeStroykomProgress}
              >
                Закрыть
              </button>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
