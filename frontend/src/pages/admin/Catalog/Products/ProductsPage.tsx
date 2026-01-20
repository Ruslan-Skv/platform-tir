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
  images: string[];
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const limit = 20;

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

  // Fetch all products once
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/products`);
      if (response.ok) {
        const data = await response.json();
        setAllProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
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

  // Toggle product active status
  const toggleProductActive = async (productId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (response.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error('Failed to toggle product status:', err);
    }
  };

  // Bulk activate/deactivate
  const bulkToggleActive = async (isActive: boolean) => {
    if (selectedIds.length === 0) return;
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
      }
    } catch (err) {
      console.error('Failed to bulk update:', err);
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

  const columns = [
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
    {
      key: 'price',
      title: 'Цена',
      sortable: true,
      render: (product: Product) => (
        <div className={styles.priceCell}>
          <span className={styles.price}>{formatCurrency(product.price)}</span>
          {product.comparePrice && (
            <span className={styles.comparePrice}>{formatCurrency(product.comparePrice)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      title: 'Остаток',
      sortable: true,
      render: (product: Product) => (
        <span
          className={`${styles.stock} ${
            product.stock === 0 ? styles.stockOut : product.stock <= 5 ? styles.stockLow : ''
          }`}
        >
          {product.stock} шт.
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (product: Product) => (
        <div className={styles.statusCell}>
          <span
            className={`${styles.statusBadge} ${
              product.isActive ? styles.active : styles.inactive
            }`}
          >
            {product.isActive ? 'Активен' : 'Скрыт'}
          </span>
          {product.isFeatured && <span className={styles.featuredBadge}>⭐</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: '100px',
      render: (product: Product) => (
        <div className={styles.actions}>
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
          <button
            className={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              toggleProductActive(product.id, product.isActive);
            }}
            title={product.isActive ? 'Скрыть' : 'Показать'}
          >
            {product.isActive ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Товары</h1>
          <span className={styles.count}>{totalProducts} товаров</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} onClick={() => setShowImportModal(true)}>
            📥 Импорт
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => {
              // TODO: Реализовать экспорт товаров
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
        <button className={styles.refreshButton} onClick={fetchProducts} disabled={loading}>
          🔄 {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className={styles.bulkActions}>
          <span>Выбрано: {selectedIds.length}</span>
          <button className={styles.bulkButton} onClick={() => bulkToggleActive(true)}>
            Активировать
          </button>
          <button className={styles.bulkButton} onClick={() => bulkToggleActive(false)}>
            Скрыть
          </button>
          <button className={`${styles.bulkButton} ${styles.danger}`} onClick={bulkDelete}>
            Удалить
          </button>
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
    </div>
  );
}
