'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './ProductsPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number | string;
  comparePrice: number | string | null;
  stock: number;
  category: Category;
  manufacturer: { id: string; name: string } | null;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  images: string[];
}

// Доступные для отображения и редактирования колонки
interface ColumnConfig {
  key: string;
  title: string;
  editable: boolean;
  type: 'text' | 'number' | 'boolean' | 'currency';
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'price', title: 'Цена', editable: true, type: 'currency' },
  { key: 'comparePrice', title: 'Старая цена', editable: true, type: 'currency' },
  { key: 'stock', title: 'Остаток', editable: true, type: 'number' },
  { key: 'isActive', title: 'Активен', editable: true, type: 'boolean' },
  { key: 'isFeatured', title: 'Хит', editable: true, type: 'boolean' },
  { key: 'isNew', title: 'Новинка', editable: true, type: 'boolean' },
];

// Типы для редактируемых значений
type EditableValue = string | number | boolean | null;
type ProductEdits = Partial<Record<string, EditableValue>>;

interface CategoriesResponse {
  id: string;
  name: string;
  slug: string;
  children?: CategoriesResponse[];
}

export function ProductsPage() {
  const { getAuthHeaders } = useAuth();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoriesResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Inline editing state
  const [editMode, setEditMode] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_products_columns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    return ['price', 'stock', 'isActive'];
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [editedProducts, setEditedProducts] = useState<Record<string, ProductEdits>>({});
  const [savingEdits, setSavingEdits] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error'>('success');

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCategoryId, setImportCategoryId] = useState('');
  const [importSkuPrefix, setImportSkuPrefix] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: { name: string; error: string }[];
    totalFound: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  // Close column selector when clicking outside
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

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Flatten categories for select dropdown (with unique keys)
  const flatCategories = useMemo(() => {
    const flatten = (cats: CategoriesResponse[], prefix = ''): { id: string; name: string }[] => {
      const result: { id: string; name: string }[] = [];
      for (const cat of cats) {
        result.push({ id: cat.id, name: prefix + cat.name });
        if (cat.children && cat.children.length > 0) {
          result.push(...flatten(cat.children, prefix + '— '));
        }
      }
      return result;
    };
    return flatten(categories);
  }, [categories]);

  // Fetch all products once (including inactive for admin)
  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch(`${API_URL}/products/admin/all`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setAllProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter and paginate products client-side
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query))
      );
    }

    // Category filter - включает подкатегории
    if (categoryFilter) {
      // Собираем ID выбранной категории и всех её подкатегорий
      const getCategoryIds = (cats: CategoriesResponse[], targetId: string): string[] => {
        const ids: string[] = [];
        const findAndCollect = (categories: CategoriesResponse[]): boolean => {
          for (const cat of categories) {
            if (cat.id === targetId) {
              // Нашли целевую категорию - собираем её ID и все подкатегории
              ids.push(cat.id);
              const collectChildren = (c: CategoriesResponse) => {
                if (c.children) {
                  for (const child of c.children) {
                    ids.push(child.id);
                    collectChildren(child);
                  }
                }
              };
              collectChildren(cat);
              return true;
            }
            if (cat.children && findAndCollect(cat.children)) {
              return true;
            }
          }
          return false;
        };
        findAndCollect(cats);
        return ids;
      };

      const categoryIds = getCategoryIds(categories, categoryFilter);
      result = result.filter((p) => categoryIds.includes(p.category.id));
    }

    // Stock filter
    if (stockFilter === 'in-stock') {
      result = result.filter((p) => p.stock > 0);
    } else if (stockFilter === 'out-of-stock') {
      result = result.filter((p) => p.stock === 0);
    } else if (stockFilter === 'low-stock') {
      result = result.filter((p) => p.stock > 0 && p.stock <= 5);
    }

    return result;
  }, [allProducts, searchQuery, categoryFilter, stockFilter]);

  const totalProducts = filteredProducts.length;
  const _totalPages = Math.ceil(totalProducts / limit);
  const paginatedProducts = filteredProducts.slice((page - 1) * limit, page * limit);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, stockFilter]);

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  // Bulk activate/deactivate
  const bulkToggleActive = async (isActive: boolean) => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const action = isActive ? 'активированы' : 'деактивированы';

    try {
      const response = await fetch(`${API_URL}/admin/catalog/products/bulk/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ ids: selectedIds, isActive }),
      });
      if (response.ok) {
        setSelectedIds([]);
        fetchProducts();

        // Show success toast
        setSaveMessage(`✓ ${count} товар(ов) ${action}`);
        setSaveMessageType('success');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage(`Ошибка при массовом обновлении`);
        setSaveMessageType('error');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to bulk update:', err);
      setSaveMessage(`Ошибка при массовом обновлении`);
      setSaveMessageType('error');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Удалить ${selectedIds.length} товар(ов)?`)) return;
    try {
      const response = await fetch(`${API_URL}/admin/catalog/products/bulk/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (response.ok) {
        setSelectedIds([]);
        fetchProducts();
      }
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    }
  };

  // Handle file import
  const handleImport = async () => {
    if (!importFile || !importCategoryId) {
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('categoryId', importCategoryId);
      if (importSkuPrefix) {
        formData.append('skuPrefix', importSkuPrefix);
      }

      const response = await fetch(`${API_URL}/admin/catalog/products/import/file`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        fetchProducts();
      } else {
        setImportResult({
          created: 0,
          updated: 0,
          totalFound: 0,
          errors: [{ name: 'Ошибка', error: result.message || 'Не удалось импортировать файл' }],
        });
      }
    } catch (err) {
      setImportResult({
        created: 0,
        updated: 0,
        totalFound: 0,
        errors: [{ name: 'Ошибка', error: 'Ошибка сети при импорте' }],
      });
    } finally {
      setImporting(false);
    }
  };

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportCategoryId('');
    setImportSkuPrefix('');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle column selection
  const toggleColumn = (columnKey: string) => {
    setSelectedColumns((prev) => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter((k) => k !== columnKey)
        : [...prev, columnKey];
      // Save to localStorage
      localStorage.setItem('admin_products_columns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

  // Handle inline edit
  const handleInlineEdit = (productId: string, field: string, value: EditableValue) => {
    setEditedProducts((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  // Get current value (edited or original)
  const getCurrentValue = (product: Product, field: string): EditableValue => {
    if (editedProducts[product.id]?.[field] !== undefined) {
      return editedProducts[product.id][field] as EditableValue;
    }
    return product[field as keyof Product] as EditableValue;
  };

  // Check if product has edits
  const hasEdits = (productId: string): boolean => {
    return Object.keys(editedProducts[productId] || {}).length > 0;
  };

  // Save all edits
  const saveAllEdits = async () => {
    const productIdsToSave = Object.keys(editedProducts).filter((id) => hasEdits(id));
    if (productIdsToSave.length === 0) return;

    setSavingEdits(true);

    try {
      // Create all save promises
      const savePromises = productIdsToSave.map(async (productId) => {
        const edits = editedProducts[productId];
        const response = await fetch(`${API_URL}/products/${productId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(edits),
        });
        if (!response.ok) {
          throw new Error(`Failed to save product ${productId}`);
        }
        return productId;
      });

      // Wait for all promises to settle (either resolve or reject)
      const results = await Promise.allSettled(savePromises);

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const errorCount = results.filter((r) => r.status === 'rejected').length;

      // Clear edits and exit edit mode
      setEditedProducts({});
      setSavingEdits(false);
      setEditMode(false); // Exit edit mode after successful save

      // Show result message
      setSaveMessage(
        errorCount === 0
          ? `✓ Успешно сохранено: ${successCount} товар(ов)`
          : `Сохранено: ${successCount}, ошибок: ${errorCount}`
      );
      setSaveMessageType(errorCount === 0 ? 'success' : 'error');

      // Auto-hide message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);

      // Refresh products list
      fetchProducts();
    } catch (err) {
      console.error('Error saving edits:', err);
      setSavingEdits(false);
      setSaveMessage('Ошибка при сохранении изменений');
      setSaveMessageType('error');
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }
  };

  // Cancel all edits
  const cancelEdits = () => {
    setEditedProducts({});
    setEditMode(false);
  };

  // Count total edits
  const totalEditsCount = Object.keys(editedProducts).filter((id) => hasEdits(id)).length;

  // Render editable cell based on column type
  const renderEditableCell = (product: Product, columnConfig: ColumnConfig) => {
    const currentValue = getCurrentValue(product, columnConfig.key);
    const isEdited = editedProducts[product.id]?.[columnConfig.key] !== undefined;

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
      return (
        <input
          type="number"
          className={`${styles.editableInput} ${isEdited ? styles.edited : ''}`}
          value={currentValue === null ? '' : currentValue}
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
    {
      key: 'category',
      title: 'Категория',
      render: (product: Product) => product.category.name,
    },
  ];

  // Generate dynamic columns based on selection and edit mode
  const dynamicColumns = selectedColumns
    .map((columnKey) => {
      const columnConfig = AVAILABLE_COLUMNS.find((c) => c.key === columnKey);
      if (!columnConfig) return null;

      return {
        key: columnConfig.key,
        title: columnConfig.title,
        sortable: columnConfig.type === 'number' || columnConfig.type === 'currency',
        render: (product: Product) => {
          if (editMode && columnConfig.editable) {
            return renderEditableCell(product, columnConfig);
          }

          // Non-edit mode rendering
          const value = product[columnConfig.key as keyof Product];

          if (columnConfig.type === 'currency') {
            return <span className={styles.price}>{formatCurrency(value as number)}</span>;
          }

          if (columnConfig.type === 'number') {
            const stockValue = value as number;
            return (
              <span
                className={`${styles.stock} ${
                  stockValue === 0 ? styles.stockOut : stockValue <= 5 ? styles.stockLow : ''
                }`}
              >
                {stockValue} шт.
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

          return <span>{String(value)}</span>;
        },
      };
    })
    .filter(Boolean);

  const actionColumn = {
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
        <button
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/admin/catalog/products/${product.id}/edit`;
          }}
          title="Редактировать"
        >
          ✏️
        </button>
      </div>
    ),
  };

  const columns = [...baseColumns, ...dynamicColumns, actionColumn];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Товары</h1>
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
                  <span>Отображать колонки:</span>
                </div>
                {AVAILABLE_COLUMNS.map((col) => (
                  <label key={col.key} className={styles.columnOption}>
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                    />
                    <span>{col.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            className={`${styles.secondaryButton} ${editMode ? styles.editModeActive : ''}`}
            onClick={() => {
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
          <button
            className={styles.secondaryButton}
            onClick={() => {
              alert('Функционал экспорта будет реализован позже');
            }}
          >
            📤 Экспорт
          </button>
          <button
            className={styles.addButton}
            onClick={() => (window.location.href = '/admin/catalog/products/new')}
          >
            + Добавить товар
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по названию, артикулу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
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
          className={styles.refreshButton}
          onClick={() => fetchProducts(true)}
          disabled={loading || refreshing}
        >
          🔄 {refreshing ? 'Обновление...' : loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      {selectedIds.length > 0 && !editMode && (
        <div className={styles.bulkActions}>
          <span>Выбрано: {selectedIds.length}</span>
          <button className={styles.bulkButton} onClick={() => bulkToggleActive(true)}>
            ✓ Активировать
          </button>
          <button className={styles.bulkButton} onClick={() => bulkToggleActive(false)}>
            ✗ Деактивировать
          </button>
          <button className={`${styles.bulkButton} ${styles.danger}`} onClick={bulkDelete}>
            🗑️ Удалить
          </button>
        </div>
      )}

      {/* Edit mode save bar */}
      {editMode && (
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
        data={paginatedProducts}
        columns={columns}
        keyExtractor={(product) => product.id}
        onRowClick={(product) => {
          window.location.href = `/admin/catalog/products/${product.id}/edit`;
        }}
        selectable
        onSelectionChange={setSelectedIds}
        loading={loading}
        emptyMessage="Товары не найдены"
        pagination={{
          page,
          limit,
          total: totalProducts,
          onPageChange: setPage,
        }}
      />

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
    </div>
  );
}
