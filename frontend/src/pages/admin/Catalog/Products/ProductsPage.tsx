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
  sortOrder?: number;
  attributes?: Record<string, string | number | boolean | string[]> | null;
  images: string[];
  suppliers?: Array<{
    id: string;
    supplierId: string;
    isMainSupplier: boolean;
    supplierPrice?: string | number;
    supplierProductUrl?: string | null;
    supplierPriceChangedAt?: string | null;
    supplier: {
      id: string;
      legalName: string;
      commercialName?: string | null;
    };
  }>;
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
  { key: 'supplierPrice', title: 'Цена поставщика', editable: false, type: 'currency' },
  { key: 'stock', title: 'Остаток', editable: true, type: 'number' },
  { key: 'sortOrder', title: 'Сортировка', editable: true, type: 'number' },
  { key: 'isActive', title: 'Активен', editable: true, type: 'boolean' },
  { key: 'isFeatured', title: 'Хит', editable: true, type: 'boolean' },
  { key: 'isNew', title: 'Новинка', editable: true, type: 'boolean' },
  { key: 'supplier', title: 'Поставщик', editable: true, type: 'text' },
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
  const [categoryAttributes, setCategoryAttributes] = useState<
    Array<{ id: string; name: string; slug: string; type: string }>
  >([]);
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; legalName: string; commercialName?: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const hasSelection = selectedIds.length > 0;
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Advanced filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [newFilter, setNewFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  // Export state (экспортируем только выбранные товары)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('selected');

  // Модалка подтверждения массового удаления
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Обновление цен поставщика (по ссылкам) и синхронизация (цена товара = цена поставщика)
  const [updatingSupplierPrices, setUpdatingSupplierPrices] = useState(false);
  const [syncingSupplierPrices, setSyncingSupplierPrices] = useState(false);
  const [syncSupplierPricesMessage, setSyncSupplierPricesMessage] = useState<string | null>(null);
  const [selectionHintMessage, setSelectionHintMessage] = useState<string | null>(null);
  /** ID товаров, у которых изменилась цена поставщика после «Обновить цены» */
  const [priceChangedIds, setPriceChangedIds] = useState<string[]>([]);
  const selectionHintTimeoutRef = useRef<number | null>(null);

  const showSelectionHint = useCallback((message = 'Выберите товары в таблице') => {
    setSelectionHintMessage(message);
    if (selectionHintTimeoutRef.current) {
      window.clearTimeout(selectionHintTimeoutRef.current);
    }
    selectionHintTimeoutRef.current = window.setTimeout(() => {
      setSelectionHintMessage(null);
      selectionHintTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (selectionHintTimeoutRef.current) {
        window.clearTimeout(selectionHintTimeoutRef.current);
      }
    };
  }, []);

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

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch(`${API_URL}/admin/catalog/suppliers?limit=1000`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch suppliers:', err);
      }
    };
    fetchSuppliers();
  }, [getAuthHeaders]);

  // Fetch category attributes for all categories
  useEffect(() => {
    const fetchAllCategoryAttributes = async () => {
      if (categories.length === 0) return;

      const allAttrsMap = new Map<
        string,
        { id: string; name: string; slug: string; type: string }
      >();

      // Функция для рекурсивного обхода категорий и сбора всех ID
      const getAllCategoryIds = (cats: CategoriesResponse[]): string[] => {
        const ids: string[] = [];
        const collect = (categoryList: CategoriesResponse[]) => {
          for (const cat of categoryList) {
            ids.push(cat.id);
            if (cat.children && cat.children.length > 0) {
              collect(cat.children);
            }
          }
        };
        collect(cats);
        return ids;
      };

      const categoryIds = getAllCategoryIds(categories);

      // Загружаем атрибуты для всех категорий параллельно
      const attrPromises = categoryIds.map(async (categoryId) => {
        try {
          const response = await fetch(`${API_URL}/categories/${categoryId}/attributes`);
          if (response.ok) {
            const attrs: Array<{
              id: string;
              attributeId: string;
              attribute: { id: string; name: string; slug: string; type: string };
            }> = await response.json();
            return attrs;
          }
          return [];
        } catch (err) {
          console.error(`Failed to fetch attributes for category ${categoryId}:`, err);
          return [];
        }
      });

      const allAttrsArrays = await Promise.all(attrPromises);
      allAttrsArrays.forEach((attrs) => {
        attrs.forEach((ca) => {
          if (!allAttrsMap.has(ca.attribute.slug)) {
            allAttrsMap.set(ca.attribute.slug, {
              id: ca.attribute.id,
              name: ca.attribute.name,
              slug: ca.attribute.slug,
              type: ca.attribute.type,
            });
          }
        });
      });

      setCategoryAttributes(Array.from(allAttrsMap.values()));
    };

    fetchAllCategoryAttributes();
  }, [categories]);

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

    // Active filter
    if (activeFilter === 'yes') {
      result = result.filter((p) => p.isActive === true);
    } else if (activeFilter === 'no') {
      result = result.filter((p) => p.isActive === false);
    }

    // Featured filter
    if (featuredFilter === 'yes') {
      result = result.filter((p) => p.isFeatured === true);
    } else if (featuredFilter === 'no') {
      result = result.filter((p) => p.isFeatured === false);
    }

    // New filter
    if (newFilter === 'yes') {
      result = result.filter((p) => p.isNew === true);
    } else if (newFilter === 'no') {
      result = result.filter((p) => p.isNew === false);
    }

    // Price range filter
    const minPrice = priceMin ? parseFloat(priceMin) : null;
    const maxPrice = priceMax ? parseFloat(priceMax) : null;
    if (minPrice !== null && !isNaN(minPrice)) {
      result = result.filter((p) => {
        const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
        return price >= minPrice;
      });
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      result = result.filter((p) => {
        const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
        return price <= maxPrice;
      });
    }

    return result;
  }, [
    allProducts,
    searchQuery,
    categoryFilter,
    stockFilter,
    activeFilter,
    featuredFilter,
    newFilter,
    priceMin,
    priceMax,
  ]);

  const totalProducts = filteredProducts.length;
  const _totalPages = Math.ceil(totalProducts / limit);
  const paginatedProducts = filteredProducts.slice((page - 1) * limit, page * limit);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    categoryFilter,
    stockFilter,
    activeFilter,
    featuredFilter,
    newFilter,
    priceMin,
    priceMax,
  ]);

  // Check if any advanced filter is active
  const hasAdvancedFilters =
    activeFilter !== 'all' ||
    featuredFilter !== 'all' ||
    newFilter !== 'all' ||
    priceMin !== '' ||
    priceMax !== '';

  // Reset all advanced filters
  const resetAdvancedFilters = () => {
    setActiveFilter('all');
    setFeaturedFilter('all');
    setNewFilter('all');
    setPriceMin('');
    setPriceMax('');
  };

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
    if (!hasSelection) return;

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

  // Bulk delete (вызывается после подтверждения в модалке)
  const performBulkDelete = async () => {
    if (!hasSelection) return;
    setDeleting(true);
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
        setShowDeleteConfirmModal(false);
        setSelectedIds([]);
        fetchProducts();
      }
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    } finally {
      setDeleting(false);
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

  // Export functions: экспортируем только выбранные товары
  const getProductsToExport = (): Product[] => {
    return allProducts.filter((p) => selectedIds.includes(p.id));
  };

  const exportToCSV = () => {
    const products = getProductsToExport();
    if (products.length === 0) {
      alert('Нет товаров для экспорта');
      return;
    }

    setExporting(true);

    try {
      // CSV headers
      const headers = [
        'ID',
        'Название',
        'Артикул',
        'Цена',
        'Старая цена',
        'Остаток',
        'Категория',
        'Активен',
        'Хит',
        'Новинка',
        'Изображения',
      ];

      // CSV rows
      const rows = products.map((p) => [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.sku || '',
        p.price,
        p.comparePrice || '',
        p.stock,
        `"${(p.category?.name || '').replace(/"/g, '""')}"`,
        p.isActive ? 'Да' : 'Нет',
        p.isFeatured ? 'Да' : 'Нет',
        p.isNew ? 'Да' : 'Нет',
        `"${(p.images || []).join(', ')}"`,
      ]);

      // BOM for UTF-8
      const BOM = '\uFEFF';
      const csvContent = BOM + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (err) {
      console.error('Export error:', err);
      alert('Ошибка при экспорте');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    const products = getProductsToExport();
    if (products.length === 0) {
      alert('Нет товаров для экспорта');
      return;
    }

    setExporting(true);

    try {
      // Create Excel XML (простой формат, работает без библиотек)
      const escapeXml = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const headers = [
        'ID',
        'Название',
        'Артикул',
        'Цена',
        'Старая цена',
        'Остаток',
        'Категория',
        'Активен',
        'Хит',
        'Новинка',
        'Изображения',
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Товары">
    <Table>
      <Row>`;

      // Headers
      headers.forEach((h) => {
        xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
      });
      xml += '</Row>';

      // Data rows
      products.forEach((p) => {
        xml += '<Row>';
        xml += `<Cell><Data ss:Type="String">${escapeXml(p.id)}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="String">${escapeXml(p.name || '')}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="String">${escapeXml(p.sku || '')}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="Number">${p.price || 0}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="Number">${p.comparePrice || 0}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="Number">${p.stock || 0}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="String">${escapeXml(p.category?.name || '')}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="String">${p.isActive ? 'Да' : 'Нет'}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="String">${p.isFeatured ? 'Да' : 'Нет'}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="String">${p.isNew ? 'Да' : 'Нет'}</Data></Cell>`;
        xml += `<Cell><Data ss:Type="String">${escapeXml((p.images || []).join(', '))}</Data></Cell>`;
        xml += '</Row>';
      });

      xml += '</Table></Worksheet></Workbook>';

      // Download
      const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (err) {
      console.error('Export error:', err);
      alert('Ошибка при экспорте');
    } finally {
      setExporting(false);
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

  // Drag and drop state for column reordering
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) {
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

      // Save to localStorage
      localStorage.setItem('admin_products_columns', JSON.stringify(newColumns));
      return newColumns;
    });

    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const moveColumn = (columnKey: string, direction: 'up' | 'down') => {
    setSelectedColumns((prev) => {
      const index = prev.indexOf(columnKey);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newColumns = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];

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
    // Special handling for supplier field
    if (field === 'supplier') {
      const mainSupplier = product.suppliers?.find((s) => s.isMainSupplier);
      return mainSupplier?.supplierId || '';
    }
    // Цена поставщика — из главного поставщика
    if (field === 'supplierPrice') {
      const mainSupplier = product.suppliers?.find((s) => s.isMainSupplier);
      return mainSupplier?.supplierPrice ?? null;
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
        const edits = { ...editedProducts[productId] };
        // Convert 'supplier' field to 'supplierId' for API
        if ('supplier' in edits) {
          edits.supplierId = edits.supplier;
          delete edits.supplier;
        }
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
        sortable: columnConfig.type === 'number' || columnConfig.type === 'currency',
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

          // Цена поставщика + пометка «изменилась»
          if (columnConfig.key === 'supplierPrice') {
            const mainSupplier = product.suppliers?.find((s) => s.isMainSupplier);
            if (!mainSupplier) {
              return <span className={styles.emptyValue}>—</span>;
            }
            const price = mainSupplier.supplierPrice;
            const changed = Boolean(mainSupplier.supplierPriceChangedAt);
            if (price === undefined || price === null) {
              return <span className={styles.emptyValue}>—</span>;
            }
            const num = typeof price === 'string' ? parseFloat(price) : Number(price);
            return (
              <span className={styles.supplierPriceCell}>
                <span className={styles.price}>{formatCurrency(Number.isNaN(num) ? 0 : num)}</span>
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

          return <span>{String(value)}</span>;
        },
      };
    })
    .filter((col): col is NonNullable<typeof col> => col !== null);

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
                const response = await fetch(`${API_URL}/products/admin/update-supplier-prices`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                  },
                  body: JSON.stringify({ productIds: selectedIds }),
                });
                if (!response.ok) {
                  const err = await response.json().catch(() => ({}));
                  throw new Error(err.message || 'Ошибка обновления цен');
                }
                const data = await response.json();
                setPriceChangedIds(data.changedIds ?? []);
                const msg =
                  data.total === 0
                    ? 'Среди выбранных нет товаров с ссылкой на товар поставщика'
                    : `Обработано: ${data.total}, обновлено: ${data.updated}, цена изменилась: ${data.changed}` +
                      (data.errors?.length ? `, ошибок: ${data.errors.length}` : '');
                setSyncSupplierPricesMessage(msg);
                setTimeout(() => setSyncSupplierPricesMessage(null), 5000);
                fetchProducts(true);
              } catch (e) {
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
                const response = await fetch(`${API_URL}/products/admin/apply-supplier-prices`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                  },
                  body: JSON.stringify({ productIds: selectedIds }),
                });
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
                fetchProducts(true);
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
          className={`${styles.filterToggleButton} ${showAdvancedFilters ? styles.active : ''} ${hasAdvancedFilters ? styles.hasFilters : ''}`}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          🔍 Фильтры{' '}
          {hasAdvancedFilters &&
            `(${[activeFilter !== 'all', featuredFilter !== 'all', newFilter !== 'all', priceMin !== '', priceMax !== ''].filter(Boolean).length})`}
        </button>
        <button
          className={styles.refreshButton}
          onClick={() => fetchProducts(true)}
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

      {hasSelection && !editMode && (
        <div className={styles.bulkActions}>
          <span>Выбрано: {selectedIds.length}</span>
          <button className={styles.bulkButton} onClick={() => bulkToggleActive(true)}>
            ✓ Активировать
          </button>
          <button className={styles.bulkButton} onClick={() => bulkToggleActive(false)}>
            ✗ Деактивировать
          </button>
          <button
            className={`${styles.bulkButton} ${styles.danger}`}
            onClick={() => setShowDeleteConfirmModal(true)}
          >
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
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        highlightedIds={priceChangedIds}
        highlightedRowClassName={styles.priceChangedRow}
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
        <div className={`${styles.toast} ${styles.toastSuccess}`}>
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
    </div>
  );
}
