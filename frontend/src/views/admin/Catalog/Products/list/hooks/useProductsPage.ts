'use client';

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth';
import {
  type MaxidoorsCatalogUi,
  type MaxidoorsImportJob,
  fetchMaxidoorsImportJob,
  resolveMaxidoorsCatalogForCategory,
  startMaxidoorsImport,
} from '@/shared/api/admin-maxidoors-import';
import {
  ADMIN_PRODUCTS_AUTHORS_QUERY_KEY,
  ADMIN_PRODUCTS_LIST_QUERY_KEY,
  fetchAdminProductAuthors,
  fetchAdminProductsList,
  fetchMergedCategoryAttributes,
  loadProductsListSort,
} from '@/shared/api/admin-products-list';
import {
  STROYKOM_HANDLES_CATEGORY_ID,
  STROYKOM_SUPPLIER_ID,
  type StroykomHandlesImportJob,
  fetchStroykomHandlesImportJob,
  isStroykomHandlesCategory,
  startStroykomHandlesImport,
} from '@/shared/api/admin-stroykom-handles-import';
import { apiFetch } from '@/shared/lib/api-fetch';

import {
  mergeProductsListFilters,
  productsListFiltersToSearchParams,
  readProductsListFilters,
  readProductsListFiltersFromSearchParams,
  writeProductsListFilters,
} from '../products-list-filters-storage';
import {
  API_URL,
  type CategoriesResponse,
  type EditableValue,
  PRODUCTS_PAGE_LIMIT_STORAGE_KEY,
  type Product,
  type ProductEdits,
  addProductsSearchHistoryEntry,
  hrefToProductEdit,
  persistProductsSearchHistory,
  readProductsSearchHistory,
} from '../products-page.constants';

interface ProductsPageProps {
  categoryId?: string;
}

export function useProductsPage({ categoryId }: ProductsPageProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getAuthHeaders, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [categories, setCategories] = useState<CategoriesResponse[]>([]);
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; legalName: string; commercialName?: string | null }>
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readProductsSearchHistory());
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchHistoryListId = useId();
  const [categoryFilter, setCategoryFilter] = useState(categoryId ?? '');
  const sortStorageKey = `admin_products_sort:${categoryFilter || categoryId || 'all'}`;
  const initialSortRef = useRef(loadProductsListSort(sortStorageKey));
  const [listSortBy, setListSortBy] = useState(initialSortRef.current.sortBy);
  const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>(
    initialSortRef.current.sortOrder
  );
  const [stockFilter, setStockFilter] = useState('');
  /** '' — все; '__none__' — без создателя; иначе id пользователя */
  const [authorFilter, setAuthorFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const hasSelection = selectedIds.length > 0;
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(() => {
    if (typeof window === 'undefined') return 20;
    try {
      const raw = localStorage.getItem(PRODUCTS_PAGE_LIMIT_STORAGE_KEY);
      if (!raw) return 20;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    } catch {
      return 20;
    }
  });

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
      const saved =
        localStorage.getItem('admin_products_columns') ??
        localStorage.getItem('admin_product_table_template_columns');
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
  const [syncSupplierPricesMessageType, setSyncSupplierPricesMessageType] = useState<
    'success' | 'warning' | 'error'
  >('success');
  const selectionHintTimeoutRef = useRef<number | null>(null);
  const selectedProductsCacheRef = useRef<Map<string, Product>>(new Map());

  const invalidateProductsList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [ADMIN_PRODUCTS_LIST_QUERY_KEY] });
  }, [queryClient]);

  const { data: authorOptions = [] } = useQuery({
    queryKey: [ADMIN_PRODUCTS_AUTHORS_QUERY_KEY],
    queryFn: () => fetchAdminProductAuthors(getAuthHeaders()),
    staleTime: 5 * 60 * 1000,
  });

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

  // Категория для fromCategory / предзаполнения «новый товар» — только то, что выбрано в селекте.
  // Так «Все категории» не подменяется на categoryId из URL и обратный переход из карточки совпадает с фильтром.
  const persistedCategoryId = categoryFilter;

  /** Предыдущий categoryId из URL — чтобы сбросить селект при уходе с /products/category/:id на /products */
  const prevRouteCategoryIdRef = useRef<string | undefined>(undefined);
  const filtersHydratedRef = useRef(false);
  const isRestoringFiltersRef = useRef(false);
  const skipFiltersPersistRef = useRef(true);
  const restoredListFiltersRef = useRef(false);
  const prevSortStorageKeyRef = useRef(`admin_products_sort:${categoryId ?? 'all'}`);

  useEffect(() => {
    return () => {
      if (selectionHintTimeoutRef.current) {
        window.clearTimeout(selectionHintTimeoutRef.current);
      }
    };
  }, []);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Восстановить фильтры и сортировку после возврата из карточки товара (до paint)
  useLayoutEffect(() => {
    if (restoredListFiltersRef.current) return;
    restoredListFiltersRef.current = true;

    const fromUrl = readProductsListFiltersFromSearchParams(searchParams);
    const saved = readProductsListFilters();
    const restored = mergeProductsListFilters(saved, fromUrl);

    setSearchQuery(restored.searchQuery);
    if (!categoryId) {
      setCategoryFilter(restored.categoryFilter);
    }
    setStockFilter(restored.stockFilter);
    setAuthorFilter(restored.authorFilter);
    setPage(restored.page);
    setActiveFilter(restored.activeFilter);
    setFeaturedFilter(restored.featuredFilter);
    setNewFilter(restored.newFilter);
    setPriceMin(restored.priceMin);
    setPriceMax(restored.priceMax);
    setShowAdvancedFilters(restored.showAdvancedFilters);

    const sortKey = `admin_products_sort:${categoryId || restored.categoryFilter || 'all'}`;
    const sortFromUrl = fromUrl.listSortBy
      ? { sortBy: restored.listSortBy, sortOrder: restored.listSortOrder }
      : loadProductsListSort(sortKey);
    setListSortBy(sortFromUrl.sortBy);
    setListSortOrder(sortFromUrl.sortOrder);
    prevSortStorageKeyRef.current = sortKey;

    filtersHydratedRef.current = true;
    isRestoringFiltersRef.current = true;
    skipFiltersPersistRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- восстанавливаем один раз при монтировании
  }, [categoryId]);

  // Синхронизация фильтра с маршрутом: /products/category/:id → селект = id; уход на /products → сброс «Все категории»
  useEffect(() => {
    if (categoryId) {
      setCategoryFilter(categoryId);
    } else if (prevRouteCategoryIdRef.current) {
      setCategoryFilter('');
    }
    prevRouteCategoryIdRef.current = categoryId;
  }, [categoryId]);

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

  // Fetch categories (в админке — все категории, включая неактивные, для корректной фильтрации)
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const fetchCategories = async () => {
      try {
        const response = await apiFetch(`${API_URL}/categories?includeInactive=true`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, [getAuthHeaders, isAuthenticated, isAuthLoading]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await apiFetch(`${API_URL}/admin/catalog/suppliers?limit=1000`, {
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

  const listQueryParams = useMemo(
    () => ({
      search: searchQuery.trim() || undefined,
      categoryId: categoryFilter || undefined,
      stockFilter: stockFilter || undefined,
      createdById: authorFilter || undefined,
      isActive: activeFilter === 'yes' ? true : activeFilter === 'no' ? false : undefined,
      isFeatured: featuredFilter === 'yes' ? true : featuredFilter === 'no' ? false : undefined,
      isNew: newFilter === 'yes' ? true : newFilter === 'no' ? false : undefined,
      minPrice: (() => {
        if (!priceMin) return undefined;
        const value = parseFloat(priceMin);
        return Number.isNaN(value) ? undefined : value;
      })(),
      maxPrice: (() => {
        if (!priceMax) return undefined;
        const value = parseFloat(priceMax);
        return Number.isNaN(value) ? undefined : value;
      })(),
      page,
      limit,
      sortBy: listSortBy,
      sortOrder: listSortOrder,
    }),
    [
      searchQuery,
      categoryFilter,
      stockFilter,
      authorFilter,
      activeFilter,
      featuredFilter,
      newFilter,
      priceMin,
      priceMax,
      page,
      limit,
      listSortBy,
      listSortOrder,
    ]
  );

  const {
    data: listResponse,
    isLoading: loading,
    isFetching: refreshing,
    refetch: refetchProductsList,
  } = useQuery({
    queryKey: [ADMIN_PRODUCTS_LIST_QUERY_KEY, listQueryParams],
    queryFn: () => fetchAdminProductsList(listQueryParams, getAuthHeaders()),
    placeholderData: keepPreviousData,
  });

  const listProducts = useMemo(() => listResponse?.data ?? [], [listResponse?.data]);
  const totalProducts = listResponse?.total ?? 0;

  useEffect(() => {
    for (const product of listProducts) {
      selectedProductsCacheRef.current.set(product.id, product);
    }
  }, [listProducts]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    if (prevSortStorageKeyRef.current === sortStorageKey) return;
    prevSortStorageKeyRef.current = sortStorageKey;
    const next = loadProductsListSort(sortStorageKey);
    setListSortBy(next.sortBy);
    setListSortOrder(next.sortOrder);
  }, [sortStorageKey]);

  // Собираем ID категорий для загрузки атрибутов колонок таблицы.
  const categoryIdsForAttributes = useMemo(() => {
    const collectIds = (cats: CategoriesResponse[]): string[] => {
      const ids: string[] = [];
      for (const cat of cats) {
        ids.push(cat.id);
        if (cat.children?.length) {
          ids.push(...collectIds(cat.children));
        }
      }
      return ids;
    };
    if (categoryFilter) {
      const findAndCollect = (cats: CategoriesResponse[], targetId: string): string[] => {
        for (const cat of cats) {
          if (cat.id === targetId) {
            return [cat.id, ...collectIds(cat.children ?? [])];
          }
          if (cat.children?.length) {
            const found = findAndCollect(cat.children, targetId);
            if (found.length > 0) return found;
          }
        }
        return [];
      };
      return findAndCollect(categories, categoryFilter);
    }
    const ids = new Set<string>();
    for (const product of listProducts) {
      if (product.category?.id) ids.add(product.category.id);
    }
    return Array.from(ids);
  }, [categories, categoryFilter, listProducts]);

  const { data: categoryAttributes = [] } = useQuery({
    queryKey: ['category-attributes-merged', categoryIdsForAttributes],
    queryFn: () => fetchMergedCategoryAttributes(categoryIdsForAttributes),
    enabled: categoryIdsForAttributes.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Заголовок только по селекту: пустое значение = «Товары» без подзаголовка (не подставляем categoryId из URL).
  const currentCategoryName = useMemo(() => {
    if (!categoryFilter) return null;
    const findName = (cats: CategoriesResponse[], id: string): string | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat.name;
        if (cat.children?.length) {
          const found = findName(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    return findName(categories, categoryFilter);
  }, [categories, categoryFilter]);

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

  const visibleRecentSearches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return recentSearches;
    return recentSearches.filter((item) => item.toLowerCase().includes(query));
  }, [recentSearches, searchQuery]);

  const showSearchHistory = searchDropdownOpen && visibleRecentSearches.length > 0;

  const cancelSearchBlurClose = useCallback(() => {
    if (searchBlurTimerRef.current !== null) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
  }, []);

  const commitSearchToHistory = useCallback((query: string) => {
    setRecentSearches((prev) => {
      const next = addProductsSearchHistoryEntry(query, prev);
      if (next.length === prev.length && next.every((item, index) => item === prev[index])) {
        return prev;
      }
      persistProductsSearchHistory(next);
      return next;
    });
  }, []);

  const handleSearchFocus = useCallback(() => {
    cancelSearchBlurClose();
    if (recentSearches.length > 0) {
      setSearchDropdownOpen(true);
    }
  }, [cancelSearchBlurClose, recentSearches.length]);

  const handleSearchBlur = useCallback(() => {
    searchBlurTimerRef.current = setTimeout(() => {
      setSearchDropdownOpen(false);
      searchBlurTimerRef.current = null;
    }, 180);
  }, []);

  const handleSearchBlurWithSave = useCallback(() => {
    commitSearchToHistory(searchQuery);
    handleSearchBlur();
  }, [commitSearchToHistory, handleSearchBlur, searchQuery]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (recentSearches.length === 0) {
        setSearchDropdownOpen(false);
        return;
      }
      const query = value.trim().toLowerCase();
      const hasMatches =
        query.length === 0 || recentSearches.some((item) => item.toLowerCase().includes(query));
      setSearchDropdownOpen(hasMatches);
    },
    [recentSearches]
  );

  const handleSearchKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setSearchDropdownOpen(false);
        return;
      }
      if (e.key === 'Enter') {
        commitSearchToHistory(searchQuery);
        setSearchDropdownOpen(false);
      }
    },
    [commitSearchToHistory, searchQuery]
  );

  const pickRecentSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      commitSearchToHistory(query);
      setPage(1);
      setSearchDropdownOpen(false);
    },
    [commitSearchToHistory]
  );

  const listFiltersSnapshot = useMemo(
    () => ({
      searchQuery,
      categoryFilter,
      stockFilter,
      authorFilter,
      page,
      activeFilter,
      featuredFilter,
      newFilter,
      priceMin,
      priceMax,
      showAdvancedFilters,
      listSortBy,
      listSortOrder,
    }),
    [
      searchQuery,
      categoryFilter,
      stockFilter,
      authorFilter,
      page,
      activeFilter,
      featuredFilter,
      newFilter,
      priceMin,
      priceMax,
      showAdvancedFilters,
      listSortBy,
      listSortOrder,
    ]
  );

  const persistListFiltersNow = useCallback(() => {
    writeProductsListFilters(listFiltersSnapshot);
  }, [listFiltersSnapshot]);

  const navigateToProductEdit = useCallback(
    (productId: string) => {
      persistListFiltersNow();
      router.push(hrefToProductEdit(productId, persistedCategoryId));
    },
    [persistListFiltersNow, persistedCategoryId, router]
  );

  const handleListSortChange = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc') => {
      setListSortBy(sortBy);
      setListSortOrder(sortOrder);
      setPage(1);
      try {
        localStorage.setItem(sortStorageKey, JSON.stringify({ sortBy, sortOrder }));
      } catch {
        // ignore
      }
    },
    [sortStorageKey]
  );

  // Синхронизируем фильтры и сортировку с URL — состояние сохраняется при возврате из карточки
  useEffect(() => {
    if (!filtersHydratedRef.current) return;

    const params = productsListFiltersToSearchParams(listFiltersSnapshot, {
      omitCategory: Boolean(categoryId),
    });
    params.delete('refresh');

    const qs = params.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete('refresh');
    const currentUrl = currentParams.toString()
      ? `${pathname}?${currentParams.toString()}`
      : pathname;
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [listFiltersSnapshot, pathname, router, searchParams, categoryId]);

  // Reset page when filters change (не сбрасываем при восстановлении после возврата из карточки)
  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    if (isRestoringFiltersRef.current) {
      isRestoringFiltersRef.current = false;
      return;
    }
    setPage(1);
  }, [
    searchQuery,
    categoryFilter,
    stockFilter,
    authorFilter,
    activeFilter,
    featuredFilter,
    newFilter,
    priceMin,
    priceMax,
  ]);

  // Сохраняем фильтры списка в sessionStorage — восстанавливаются после «Назад к списку»
  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    if (skipFiltersPersistRef.current) {
      skipFiltersPersistRef.current = false;
      return;
    }
    writeProductsListFilters(listFiltersSnapshot);
  }, [listFiltersSnapshot]);

  // Persist selected page size between navigations
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PRODUCTS_PAGE_LIMIT_STORAGE_KEY, String(limit));
  }, [limit]);

  // После SSR/навигации восстановить лимит из localStorage (useState-инициализатор на сервере даёт 20)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_PAGE_LIMIT_STORAGE_KEY);
      if (!raw) return;
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0 && parsed !== limit) {
        setLimit(parsed);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при монтировании
  }, []);

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
      const response = await apiFetch(`${API_URL}/admin/catalog/products/bulk/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ ids: selectedIds, isActive }),
      });
      if (response.ok) {
        setSelectedIds([]);
        invalidateProductsList();

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
      const response = await apiFetch(`${API_URL}/admin/catalog/products/bulk/delete`, {
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
        invalidateProductsList();
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

      const response = await apiFetch(`${API_URL}/admin/catalog/products/import/file`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        invalidateProductsList();
      } else {
        setImportResult({
          created: 0,
          updated: 0,
          totalFound: 0,
          errors: [{ name: 'Ошибка', error: result.message || 'Не удалось импортировать файл' }],
        });
      }
    } catch {
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
    return selectedIds
      .map((id) => selectedProductsCacheRef.current.get(id))
      .filter((product): product is Product => Boolean(product));
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
        'Товар партнёра',
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
        p.isPartnerProduct ? 'Да' : 'Нет',
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
        'Товар партнёра',
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
        xml += `<Cell><Data ss:Type="String">${p.isPartnerProduct ? 'Да' : 'Нет'}</Data></Cell>`;
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
        const response = await apiFetch(`${API_URL}/products/${productId}`, {
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
      invalidateProductsList();
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

  const showStroykomHandlesImport =
    isStroykomHandlesCategory(categoryFilter || categoryId) ||
    currentCategoryName?.trim().toLowerCase() === 'ручки';

  const maxidoorsCatalog: MaxidoorsCatalogUi | null = resolveMaxidoorsCatalogForCategory(
    categoryFilter || categoryId,
    currentCategoryName
  );
  const showMaxidoorsImport = Boolean(maxidoorsCatalog);

  const [stroykomConfirmOpen, setStroykomConfirmOpen] = useState(false);
  const [stroykomJob, setStroykomJob] = useState<StroykomHandlesImportJob | null>(null);
  const [stroykomStarting, setStroykomStarting] = useState(false);
  const [stroykomError, setStroykomError] = useState<string | null>(null);

  const [maxidoorsConfirmOpen, setMaxidoorsConfirmOpen] = useState(false);
  const [maxidoorsJob, setMaxidoorsJob] = useState<MaxidoorsImportJob | null>(null);
  const [maxidoorsStarting, setMaxidoorsStarting] = useState(false);
  const [maxidoorsError, setMaxidoorsError] = useState<string | null>(null);

  const startStroykomImport = async () => {
    setStroykomStarting(true);
    setStroykomError(null);
    try {
      const { jobId } = await startStroykomHandlesImport(
        {
          categoryId: categoryFilter || categoryId || STROYKOM_HANDLES_CATEGORY_ID,
          supplierId: STROYKOM_SUPPLIER_ID,
          skipExisting: true,
        },
        getAuthHeaders()
      );
      setStroykomConfirmOpen(false);
      const initial = await fetchStroykomHandlesImportJob(jobId, getAuthHeaders());
      setStroykomJob(initial);
    } catch (e) {
      setStroykomError(e instanceof Error ? e.message : 'Ошибка запуска импорта');
    } finally {
      setStroykomStarting(false);
    }
  };

  const startMaxidoorsCatalogImport = async () => {
    if (!maxidoorsCatalog) return;
    setMaxidoorsStarting(true);
    setMaxidoorsError(null);
    try {
      const { jobId } = await startMaxidoorsImport(
        {
          catalog: maxidoorsCatalog.key,
          categoryId: categoryFilter || categoryId || maxidoorsCatalog.categoryId,
          skipExisting: true,
        },
        getAuthHeaders()
      );
      setMaxidoorsConfirmOpen(false);
      const initial = await fetchMaxidoorsImportJob(jobId, getAuthHeaders());
      setMaxidoorsJob(initial);
    } catch (e) {
      setMaxidoorsError(e instanceof Error ? e.message : 'Ошибка запуска импорта');
    } finally {
      setMaxidoorsStarting(false);
    }
  };

  useEffect(() => {
    if (!stroykomJob) return;
    if (stroykomJob.status === 'done' || stroykomJob.status === 'error') {
      if (stroykomJob.status === 'done') {
        invalidateProductsList();
      }
      return;
    }
    const t = window.setInterval(() => {
      void fetchStroykomHandlesImportJob(stroykomJob.id, getAuthHeaders())
        .then((job) => setStroykomJob(job))
        .catch((e) => setStroykomError(e instanceof Error ? e.message : 'Ошибка статуса импорта'));
    }, 1500);
    return () => window.clearInterval(t);
  }, [stroykomJob, getAuthHeaders, invalidateProductsList]);

  const closeStroykomProgress = () => {
    if (stroykomJob?.status === 'running' || stroykomJob?.status === 'pending') return;
    setStroykomJob(null);
    setStroykomError(null);
  };

  useEffect(() => {
    if (!maxidoorsJob) return;
    if (maxidoorsJob.status === 'done' || maxidoorsJob.status === 'error') {
      if (maxidoorsJob.status === 'done') {
        invalidateProductsList();
      }
      return;
    }
    const t = window.setInterval(() => {
      void fetchMaxidoorsImportJob(maxidoorsJob.id, getAuthHeaders())
        .then((job) => setMaxidoorsJob(job))
        .catch((e) => setMaxidoorsError(e instanceof Error ? e.message : 'Ошибка статуса импорта'));
    }, 1500);
    return () => window.clearInterval(t);
  }, [maxidoorsJob, getAuthHeaders, invalidateProductsList]);

  const closeMaxidoorsProgress = () => {
    if (maxidoorsJob?.status === 'running' || maxidoorsJob?.status === 'pending') return;
    setMaxidoorsJob(null);
    setMaxidoorsError(null);
  };

  return {
    categoryId,
    router,
    getAuthHeaders,
    suppliers,
    searchQuery,
    recentSearches,
    searchDropdownOpen,
    searchHistoryListId,
    categoryFilter,
    setCategoryFilter,
    sortStorageKey,
    listSortBy,
    setListSortBy,
    listSortOrder,
    setListSortOrder,
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
    setSaveMessageType,
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
    showStroykomHandlesImport,
    stroykomConfirmOpen,
    setStroykomConfirmOpen,
    stroykomJob,
    stroykomStarting,
    stroykomError,
    startStroykomImport,
    closeStroykomProgress,
    showMaxidoorsImport,
    maxidoorsCatalog,
    maxidoorsConfirmOpen,
    setMaxidoorsConfirmOpen,
    maxidoorsJob,
    maxidoorsStarting,
    maxidoorsError,
    startMaxidoorsCatalogImport,
    closeMaxidoorsProgress,
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
    handleListSortChange,
    showSelectionHint,
    invalidateProductsList,
    setEditedProducts,
  };
}

export type ProductsPageModel = ReturnType<typeof useProductsPage>;
