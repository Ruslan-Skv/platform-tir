'use client';

import { FunnelIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { useSearchParams } from 'next/navigation';

import type { Product } from '@/entities/product/types';
import { useMobileCatalogColumns } from '@/shared/lib/hooks';
import {
  applyCatalogFilters,
  filterSearchSignature,
} from '@/views/catalog/lib/applyCatalogFilters';
import {
  type CategoryFilterOption,
  buildCategoryFilterOptions,
} from '@/views/catalog/lib/buildCategoryFilterOptions';
import type { CatalogFilterFacet } from '@/views/catalog/lib/catalogFilters.types';
import {
  type CatalogApiProduct,
  mapCatalogApiProductToProduct,
} from '@/views/catalog/lib/mapCatalogApiProductToProduct';

import { ProductCard } from './ProductCard';
import styles from './ProductsGrid.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface CategoryResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  products: CatalogApiProduct[];
  total: number;
}

interface ProductsGridProps {
  categorySlug?: string;
  categoryName?: string;
  currentPage?: number;
  onTotalPagesChange?: (totalPages: number) => void;
  onSortChange?: () => void;
  /** Вызывается при переключении десктоп ↔ мобильный (меняется число товаров на страницу) */
  onProductsPerPageLayoutChange?: () => void;
  /** Фасеты с бэкенда (те же, что в FiltersSidebar) — для клиентской фильтрации */
  catalogFilters?: CatalogFilterFacet[];
  /** Границы цен по исходному списку категории/поиска (до фильтров) */
  onBasePriceBoundsChange?: (bounds: { min: number; max: number } | null) => void;
  /** Уникальные подкатегории в выборке — для блока «Категория» в фильтрах (>1) */
  onCategoryFilterOptionsChange?: (options: CategoryFilterOption[]) => void;
  /** Мобильный каталог: иконка фильтров справа от заголовка */
  showMobileFiltersButton?: boolean;
  onMobileFiltersOpen?: () => void;
}

/** Десктоп: 3 колонки × 5 строк; остальное — пагинация */
const PRODUCTS_PER_PAGE_DESKTOP = 15;
/**
 * Мобильный каталог (≤768px, как в ProductsGrid.module.css): чётное число,
 * чтобы при сетке в 2 колонки не оставалась одна карточка в последнем ряду.
 */
const PRODUCTS_PER_PAGE_MOBILE = 16;

const MOBILE_CATALOG_MEDIA = '(max-width: 768px)';

function subscribeMobileCatalogViewport(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(MOBILE_CATALOG_MEDIA);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getMobileCatalogViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_CATALOG_MEDIA).matches;
}

type SortOption =
  | 'default'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc'
  | 'new'
  | 'rating';

function sortProducts(productsToSort: Product[], sortOption: SortOption): Product[] {
  const sorted = [...productsToSort];

  switch (sortOption) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
    case 'new':
      return sorted.sort((a, b) => {
        if (a.isNew !== b.isNew) {
          return a.isNew ? -1 : 1;
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'default':
    default:
      return sorted.sort((a, b) => {
        const sortOrderA = a.sortOrder ?? 0;
        const sortOrderB = b.sortOrder ?? 0;
        if (sortOrderA !== sortOrderB) {
          return sortOrderA - sortOrderB;
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }
}

export const ProductsGrid: React.FC<ProductsGridProps> = ({
  categorySlug,
  categoryName = 'Каталог',
  currentPage = 1,
  onTotalPagesChange,
  onSortChange,
  onProductsPerPageLayoutChange,
  catalogFilters,
  onBasePriceBoundsChange,
  onCategoryFilterOptionsChange,
  showMobileFiltersButton = false,
  onMobileFiltersOpen,
}) => {
  const searchParams = useSearchParams();
  const catalogSearchRaw = searchParams.get('search');
  const catalogSearch = catalogSearchRaw?.trim() ?? '';

  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const mobileCatalogColumns = useMobileCatalogColumns();
  const isMobileCatalogViewport = useSyncExternalStore(
    subscribeMobileCatalogViewport,
    getMobileCatalogViewport,
    () => false
  );
  const productsPerPage = isMobileCatalogViewport
    ? PRODUCTS_PER_PAGE_MOBILE
    : PRODUCTS_PER_PAGE_DESKTOP;
  const [partnerSettings, setPartnerSettings] = useState<{
    partnerLogoUrl: string | null;
    showPartnerIconOnCards: boolean;
  }>({ partnerLogoUrl: null, showPartnerIconOnCards: true });

  useEffect(() => {
    const fetchProducts = async () => {
      if (!categorySlug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams();
        if (catalogSearch) {
          qs.set('search', catalogSearch);
        }
        const queryString = qs.toString();

        // Для slug "all" используем специальный endpoint для всех товаров
        const basePath =
          categorySlug === 'all'
            ? `${API_URL}/products/catalog/all`
            : `${API_URL}/products/category/${encodeURIComponent(categorySlug)}`;
        const endpoint = queryString ? `${basePath}?${queryString}` : basePath;
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error('Не удалось загрузить товары');
        }

        const data: CategoryResponse = await response.json();

        const mappedProducts: Product[] = data.products.map((p, index) =>
          mapCatalogApiProductToProduct(p, index)
        );

        setOriginalProducts(mappedProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // Сбрасываем сортировку при изменении категории
    setSortBy('default');
  }, [categorySlug, catalogSearch]);

  useEffect(() => {
    const fetchPartnerSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/home/partner-products`);
        if (res.ok) {
          const data = await res.json();
          setPartnerSettings({
            partnerLogoUrl: data.partnerLogoUrl ?? null,
            showPartnerIconOnCards: data.showPartnerIconOnCards ?? true,
          });
        }
      } catch {
        // ignore
      }
    };
    fetchPartnerSettings();
  }, []);

  useEffect(() => {
    if (!onBasePriceBoundsChange) return;
    if (originalProducts.length === 0) {
      onBasePriceBoundsChange(null);
      return;
    }
    const prices = originalProducts.map((p) => p.price).filter((x) => Number.isFinite(x));
    if (prices.length === 0) {
      onBasePriceBoundsChange(null);
      return;
    }
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    onBasePriceBoundsChange({ min, max });
  }, [originalProducts, onBasePriceBoundsChange]);

  useEffect(() => {
    if (!onCategoryFilterOptionsChange) return;
    onCategoryFilterOptionsChange(buildCategoryFilterOptions(originalProducts));
  }, [originalProducts, onCategoryFilterOptionsChange]);

  const prevFilterSigRef = useRef<string | null>(null);
  useEffect(() => {
    const sig = filterSearchSignature(searchParams);
    if (prevFilterSigRef.current === null) {
      prevFilterSigRef.current = sig;
      return;
    }
    if (prevFilterSigRef.current !== sig) {
      prevFilterSigRef.current = sig;
      onSortChange?.();
    }
  }, [searchParams, onSortChange]);

  const filteredSortedProducts = useMemo(() => {
    const filtered = applyCatalogFilters(originalProducts, searchParams, catalogFilters ?? []);
    return sortProducts(filtered, sortBy);
  }, [originalProducts, searchParams, catalogFilters, sortBy]);

  // Пагинация - вычисляем до условных возвратов
  const totalPages = Math.ceil(filteredSortedProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredSortedProducts.slice(startIndex, endIndex);

  // Передаём количество страниц в родительский компонент
  // Этот useEffect должен быть до условных return, чтобы соблюдать правила хуков
  useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [totalPages, onTotalPagesChange]);

  const prevMobileViewportRef = useRef(isMobileCatalogViewport);
  useEffect(() => {
    if (prevMobileViewportRef.current !== isMobileCatalogViewport) {
      prevMobileViewportRef.current = isMobileCatalogViewport;
      onProductsPerPageLayoutChange?.();
    }
  }, [isMobileCatalogViewport, onProductsPerPageLayoutChange]);

  const titleBlock = (
    <div className={styles.titleBlock}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{categoryName}</h1>
        {showMobileFiltersButton && onMobileFiltersOpen ? (
          <button
            type="button"
            className={styles.mobileFiltersIconButton}
            onClick={onMobileFiltersOpen}
            aria-label="Открыть фильтры"
          >
            <FunnelIcon className={styles.mobileFiltersIcon} aria-hidden />
          </button>
        ) : null}
      </div>
      {catalogSearch ? (
        <p className={styles.searchQueryHint}>По запросу: «{catalogSearch}»</p>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <div className={styles.productsGrid}>
        <div className={styles.gridHeader}>{titleBlock}</div>
        <div className={styles.loading}>Загрузка товаров...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.productsGrid}>
        <div className={styles.gridHeader}>{titleBlock}</div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (filteredSortedProducts.length === 0) {
    return (
      <div className={styles.productsGrid}>
        <div className={styles.gridHeader}>{titleBlock}</div>
        <div className={styles.empty}>
          {originalProducts.length > 0 ? 'Нет товаров по выбранным фильтрам' : 'Товары не найдены'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.productsGrid}>
      <div className={styles.gridHeader}>
        {titleBlock}
        <div className={styles.headerRight}>
          <span className={styles.totalCount}>
            {filteredSortedProducts.length}{' '}
            {filteredSortedProducts.length === 1
              ? 'товар'
              : filteredSortedProducts.length < 5
                ? 'товара'
                : 'товаров'}
          </span>
          <div className={styles.sorting}>
            <label htmlFor="sort-select" className={styles.sortLabel}>
              Сортировка:
            </label>
            <select
              id="sort-select"
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                // Сбрасываем на первую страницу при изменении сортировки
                onSortChange?.();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <option value="default">По умолчанию</option>
              <option value="price-asc">По цене (сначала дешевые)</option>
              <option value="price-desc">По цене (сначала дорогие)</option>
              <option value="name-asc">По названию (А-Я)</option>
              <option value="name-desc">По названию (Я-А)</option>
              <option value="new">По новизне</option>
              <option value="rating">По рейтингу</option>
            </select>
          </div>
        </div>
      </div>

      <div className={`${styles.grid} ${mobileCatalogColumns === 2 ? styles.gridMobile2 : ''}`}>
        {currentProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            partnerLogoUrl={partnerSettings.partnerLogoUrl}
            showPartnerIconOnCards={partnerSettings.showPartnerIconOnCards}
          />
        ))}
      </div>
    </div>
  );
};
