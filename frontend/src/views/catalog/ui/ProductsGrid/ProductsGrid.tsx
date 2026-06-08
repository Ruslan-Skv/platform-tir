'use client';

import { FunnelIcon } from '@heroicons/react/24/outline';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import type { Product } from '@/entities/product/types';
import type {
  PublicCatalogPageResponse,
  PublicCatalogSort,
} from '@/shared/api/public-catalog-list';
import { apiFetch } from '@/shared/lib/api-fetch';
import {
  CATALOG_SORT_OPTIONS,
  catalogFilterSignature,
  parseCatalogSearchParams,
} from '@/views/catalog/lib/catalog-search-params';
import {
  type CatalogApiProduct,
  mapCatalogApiProductToProduct,
} from '@/views/catalog/lib/mapCatalogApiProductToProduct';
import { newURLSearchParamsLive } from '@/views/catalog/lib/newURLSearchParamsLive';
import { patchProductInCatalogPageCache } from '@/views/catalog/lib/patch-catalog-page-cache';
import { useCatalogPage } from '@/views/catalog/lib/useCatalogPage';
import { useCatalogProductsPerPage } from '@/views/catalog/lib/useCatalogProductsPerPage';

import { ProductCard } from './ProductCard';
import styles from './ProductsGrid.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ProductsGridProps {
  categorySlug?: string;
  categoryName?: string;
  currentPage?: number;
  onTotalPagesChange?: (totalPages: number) => void;
  onSortChange?: () => void;
  onProductsPerPageLayoutChange?: () => void;
  onBasePriceBoundsChange?: (bounds: { min: number; max: number } | null) => void;
  onCatalogGridReady?: (ready: boolean) => void;
  showMobileFiltersButton?: boolean;
  onMobileFiltersOpen?: () => void;
  /** SSR: первая страница с сервера */
  initialPage?: PublicCatalogPageResponse | null;
  facetBranchSlug?: string | null;
}

export const ProductsGrid: React.FC<ProductsGridProps> = ({
  categorySlug,
  categoryName = 'Каталог',
  onTotalPagesChange,
  onSortChange,
  onProductsPerPageLayoutChange,
  onBasePriceBoundsChange,
  onCatalogGridReady,
  showMobileFiltersButton = false,
  onMobileFiltersOpen,
  initialPage = null,
  facetBranchSlug = null,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const parsedParams = useMemo(() => parseCatalogSearchParams(searchParams), [searchParams]);
  const productsPerPage = useCatalogProductsPerPage();

  const hasCatalogScope =
    Boolean(categorySlug && categorySlug !== 'all') || Boolean(parsedParams.branch);

  const {
    data: pageResponse,
    isLoading,
    isFetching,
    error,
  } = useCatalogPage(categorySlug, parsedParams, facetBranchSlug, productsPerPage, initialPage);

  const mappedProducts: Product[] = useMemo(() => {
    const items = pageResponse?.products ?? [];
    return items.map((p, index) => mapCatalogApiProductToProduct(p, index));
  }, [pageResponse?.products]);

  const totalProducts = pageResponse?.total ?? 0;
  const totalPages = pageResponse?.totalPages ?? 0;

  useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [totalPages, onTotalPagesChange]);

  useEffect(() => {
    if (!onBasePriceBoundsChange) return;
    onBasePriceBoundsChange(pageResponse?.priceRange ?? null);
  }, [pageResponse?.priceRange, onBasePriceBoundsChange]);

  const loading = isLoading && !pageResponse;
  const catalogGridReady = hasCatalogScope && !loading && !error && mappedProducts.length > 0;
  useEffect(() => {
    onCatalogGridReady?.(catalogGridReady);
  }, [catalogGridReady, onCatalogGridReady]);

  const prevFilterSigRef = useRef<string | null>(null);
  useEffect(() => {
    const sig = catalogFilterSignature(searchParams);
    if (prevFilterSigRef.current === null) {
      prevFilterSigRef.current = sig;
      return;
    }
    if (prevFilterSigRef.current !== sig) {
      prevFilterSigRef.current = sig;
      const live = newURLSearchParamsLive(pathname, searchParams.toString());
      const page = Number.parseInt(live.get('page') || '1', 10);
      if (Number.isFinite(page) && page > 1) {
        onSortChange?.();
      }
    }
  }, [pathname, searchParams, onSortChange]);

  const prevProductsPerPageRef = useRef(productsPerPage);
  useEffect(() => {
    if (prevProductsPerPageRef.current !== productsPerPage) {
      prevProductsPerPageRef.current = productsPerPage;
      onProductsPerPageLayoutChange?.();
    }
  }, [productsPerPage, onProductsPerPageLayoutChange]);

  const [partnerSettings, setPartnerSettings] = React.useState<{
    partnerLogoUrl: string | null;
    showPartnerIconOnCards: boolean;
  }>({ partnerLogoUrl: null, showPartnerIconOnCards: true });

  useEffect(() => {
    const fetchPartnerSettings = async () => {
      try {
        const res = await apiFetch(`${API_URL}/home/partner-products`);
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

  const handleProductCatalogPatched = useCallback(
    (data: CatalogApiProduct) => {
      patchProductInCatalogPageCache(queryClient, data);
    },
    [queryClient]
  );

  const handleSortChange = (sort: PublicCatalogSort) => {
    const next = newURLSearchParamsLive(pathname, searchParams.toString());
    if (sort === 'default') {
      next.delete('sort');
    } else {
      next.set('sort', sort);
    }
    next.delete('page');
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    // Не вызываем onSortChange (goToFirstCatalogPage): второй router.replace с устаревшими
    // searchParams затирает только что выставленный sort.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshing = isFetching && Boolean(pageResponse);
  const isCatalogRootTitle = categoryName.trim() === 'Каталог';

  const titleBlock = (
    <div
      className={styles.titleBlock}
      data-catalog-subcategory={isCatalogRootTitle ? undefined : ''}
    >
      <div className={styles.titleRow}>
        {isCatalogRootTitle ? (
          <h1 className={styles.title}>{categoryName}</h1>
        ) : (
          <div className={styles.titleHierarchy}>
            <p className={styles.catalogRootLabel}>Каталог</p>
            <h1 className={styles.categorySubtitle}>{categoryName}</h1>
          </div>
        )}
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
      {parsedParams.search ? (
        <p className={styles.searchQueryHint}>По запросу: «{parsedParams.search}»</p>
      ) : null}
    </div>
  );

  if (!hasCatalogScope) {
    return (
      <div className={styles.productsGrid}>
        <div className={styles.gridHeader}>{titleBlock}</div>
        <div className={styles.empty}>
          Выберите категорию в фильтрах слева, чтобы просмотреть товары.
        </div>
      </div>
    );
  }

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
        <div className={styles.error}>
          {error instanceof Error ? error.message : 'Произошла ошибка'}
        </div>
      </div>
    );
  }

  if (mappedProducts.length === 0) {
    return (
      <div className={styles.productsGrid}>
        <div className={styles.gridHeader}>{titleBlock}</div>
        <div className={styles.empty}>Нет товаров по выбранным фильтрам</div>
      </div>
    );
  }

  return (
    <div className={styles.productsGrid}>
      <div className={styles.gridHeader}>
        {titleBlock}
        <div className={styles.headerRight}>
          <span className={styles.totalCount}>
            {totalProducts}{' '}
            {totalProducts === 1 ? 'товар' : totalProducts < 5 ? 'товара' : 'товаров'}
            {refreshing ? ' · обновление…' : ''}
          </span>
          <div className={styles.sorting}>
            <label htmlFor="sort-select" className={styles.sortLabel}>
              Сортировка:
            </label>
            <select
              id="sort-select"
              className={styles.sortSelect}
              value={parsedParams.sort}
              onChange={(e) => handleSortChange(e.target.value as PublicCatalogSort)}
            >
              {CATALOG_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {mappedProducts.map((product) => (
          <ProductCard
            key={product.originalId ?? product.id}
            product={product}
            partnerLogoUrl={partnerSettings.partnerLogoUrl}
            showPartnerIconOnCards={partnerSettings.showPartnerIconOnCards}
            onProductCatalogPatched={handleProductCatalogPatched}
          />
        ))}
      </div>
    </div>
  );
};
