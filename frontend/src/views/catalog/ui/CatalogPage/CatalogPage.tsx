'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { CatalogHubPreviewResponse } from '@/shared/api/catalog-hub-preview';
import type { PublicCatalogPageResponse } from '@/shared/api/public-catalog-list';
import type { CategoryFilterOption } from '@/views/catalog/lib/buildCategoryFilterOptions';
import { parseCatalogSearchParams } from '@/views/catalog/lib/catalog-search-params';
import { newURLSearchParamsLive } from '@/views/catalog/lib/newURLSearchParamsLive';
import { resolveActiveCatalogBranchSlug } from '@/views/catalog/lib/resolve-active-catalog-branch-slug';
import { useCatalogFilters } from '@/views/catalog/lib/useCatalogFilters';
import { useCatalogHubCategories } from '@/views/catalog/lib/useCatalogHubCategories';
import { useCatalogProductsPerPage } from '@/views/catalog/lib/useCatalogProductsPerPage';

import { Breadcrumbs } from '../Breadcrumbs';
import { CatalogHubPreview } from '../CatalogHubPreview';
import { CatalogItemListJsonLd } from '../CatalogItemListJsonLd';
import { CatalogSeoFallbackController } from '../CatalogSeoFallbackController';
import { FiltersSidebar } from '../FiltersSidebar';
import { Pagination } from '../Pagination';
import { ProductsGrid } from '../ProductsGrid';
import styles from './CatalogPage.module.css';

export interface CatalogPageProps {
  categorySlug?: string;
  categoryName?: string | null;
  parentCategoryName?: string;
  parentCategorySlug?: string;
  /** SSR: список + фильтры одним ответом */
  initialPage?: PublicCatalogPageResponse | null;
  /** SSR: категории для хаба /catalog/products (без ?branch=) */
  initialHubCategories?: CategoryFilterOption[] | null;
  /** SSR: превью разделов на хабе */
  initialHubPreview?: CatalogHubPreviewResponse | null;
  listUrl?: string;
}

function readPageFromSearchParams(searchParams: URLSearchParams): number {
  const raw = Number.parseInt(searchParams.get('page') || '1', 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 1;
}

function readSavedScrollPosition(urlKey: string): number | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(`catalog_scroll:${urlKey}`);
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

const CatalogPageContent: React.FC<CatalogPageProps> = ({
  categorySlug,
  categoryName,
  parentCategoryName,
  parentCategorySlug,
  initialPage = null,
  initialHubCategories = null,
  initialHubPreview = null,
  listUrl,
}) => {
  const displayCategoryName = categoryName || categorySlug || 'Каталог';
  const isCatalogHub = categorySlug === 'all';
  const isCategoryPage = Boolean(categorySlug && !isCatalogHub);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedParams = useMemo(() => parseCatalogSearchParams(searchParams), [searchParams]);
  const productsPerPage = useCatalogProductsPerPage();
  /** 0 — ещё не получили из сетки; нельзя начинать с 1, иначе при возврате с ?page=N эффект сразу «поджимает» URL к 1 */
  const [totalPages, setTotalPages] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [didRestoreScroll, setDidRestoreScroll] = useState(false);
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(null);

  const pageFromUrl = useMemo(() => readPageFromSearchParams(searchParams), [searchParams]);
  const searchFromUrl = searchParams.get('search') ?? '';
  const prevSearchFromUrlRef = useRef<string | null>(null);

  const facetBranchSlug = isCatalogHub ? searchParams.get('branch')?.trim() || null : null;

  const isHubPreviewMode = isCatalogHub && !facetBranchSlug;

  const [catalogGridReady, setCatalogGridReady] = useState(() =>
    Boolean(initialPage?.products?.length && !(isCatalogHub && !searchParams.get('branch')?.trim()))
  );

  const prevHubPreviewRef = useRef(isHubPreviewMode);
  useEffect(() => {
    if (prevHubPreviewRef.current && !isHubPreviewMode) {
      setCatalogGridReady(false);
    }
    prevHubPreviewRef.current = isHubPreviewMode;
  }, [isHubPreviewMode]);

  useEffect(() => {
    if (isHubPreviewMode) {
      setPriceBounds(null);
    }
  }, [isHubPreviewMode]);
  const { options: hubCategoryOptions, loading: hubCategoriesLoading } = useCatalogHubCategories(
    isCatalogHub || isCategoryPage,
    initialHubCategories
  );

  const {
    filters: catalogFilters,
    loading: filtersLoading,
    hasFacets,
    categoryFilterOptions,
  } = useCatalogFilters(categorySlug, facetBranchSlug, parsedParams, productsPerPage, initialPage);

  const catalogBranchOptions = useMemo(
    () => hubCategoryOptions.filter((o) => o.depth !== 1),
    [hubCategoryOptions]
  );

  const activeCatalogBranchSlug = useMemo(
    () =>
      isCategoryPage
        ? resolveActiveCatalogBranchSlug(categorySlug, parentCategorySlug, hubCategoryOptions)
        : null,
    [isCategoryPage, categorySlug, parentCategorySlug, hubCategoryOptions]
  );

  const subcategoryFilterOptions = useMemo(
    () => categoryFilterOptions.filter((o) => o.depth === 1),
    [categoryFilterOptions]
  );

  const effectiveCategoryOptions = useMemo(() => {
    if (isCategoryPage) return subcategoryFilterOptions;
    if (!isCatalogHub) return categoryFilterOptions;
    if (!facetBranchSlug) return hubCategoryOptions;
    const roots = hubCategoryOptions.filter((o) => o.depth !== 1);
    const children = categoryFilterOptions.filter((o) => o.depth === 1);
    const activeRoot = roots.find((r) => r.slug === facetBranchSlug);
    if (!activeRoot) return roots.length > 0 ? roots : categoryFilterOptions;
    const facetedRoot = categoryFilterOptions.find(
      (o) => o.depth === 0 && o.slug === facetBranchSlug
    );
    const rootWithCount = facetedRoot ? { ...activeRoot, count: facetedRoot.count } : activeRoot;
    return [rootWithCount, ...children];
  }, [
    isCategoryPage,
    isCatalogHub,
    facetBranchSlug,
    hubCategoryOptions,
    categoryFilterOptions,
    subcategoryFilterOptions,
  ]);

  const isSubcategoryCatalogView =
    !isHubPreviewMode && Boolean(categorySlug && categorySlug !== 'all');
  const hideMobileBreadcrumbs = isHubPreviewMode || isSubcategoryCatalogView;

  const showFilterColumn = Boolean(
    isCatalogHub ||
    (isCategoryPage && catalogBranchOptions.length > 0) ||
    filtersLoading ||
    hubCategoriesLoading ||
    hasFacets ||
    priceBounds ||
    effectiveCategoryOptions.length > 0
  );

  const catalogUrlKey = useMemo(
    () => `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`,
    [pathname, searchParams]
  );

  const currentPage = useMemo(() => {
    if (totalPages > 0) {
      return Math.min(pageFromUrl, totalPages);
    }
    return pageFromUrl;
  }, [pageFromUrl, totalPages]);

  const replacePageInUrl = useCallback(
    (page: number, scrollToTop: boolean) => {
      const params = newURLSearchParamsLive(pathname, searchParams.toString());
      if (page <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(page));
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (mobileFiltersOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (totalPages > 0 && pageFromUrl > totalPages) {
      replacePageInUrl(totalPages, false);
    }
  }, [totalPages, pageFromUrl, replacePageInUrl]);

  /** При смене поискового запроса сбрасываем страницу пагинации, чтобы не оставаться на пустой странице. */
  useEffect(() => {
    if (prevSearchFromUrlRef.current === null) {
      prevSearchFromUrlRef.current = searchFromUrl;
      return;
    }
    if (prevSearchFromUrlRef.current !== searchFromUrl) {
      prevSearchFromUrlRef.current = searchFromUrl;
      if (pageFromUrl > 1) {
        replacePageInUrl(1, false);
      }
    }
  }, [searchFromUrl, pageFromUrl, replacePageInUrl]);

  useEffect(() => {
    setDidRestoreScroll(false);
  }, [catalogUrlKey]);

  useEffect(() => {
    if (didRestoreScroll) return;
    if (totalPages <= 0) return;
    const savedY = readSavedScrollPosition(catalogUrlKey);
    if (savedY == null) {
      setDidRestoreScroll(true);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'auto' });
        sessionStorage.removeItem(`catalog_scroll:${catalogUrlKey}`);
        setDidRestoreScroll(true);
      });
    });
  }, [catalogUrlKey, didRestoreScroll, totalPages]);

  const handlePageChange = (page: number) => {
    replacePageInUrl(page, true);
  };

  const goToFirstCatalogPage = () => {
    replacePageInUrl(1, false);
  };

  return (
    <div
      className={`${styles.catalogPage}${hideMobileBreadcrumbs ? ` ${styles.catalogPageHideMobileBreadcrumbs}` : ''}`}
    >
      <CatalogSeoFallbackController syncKey={catalogUrlKey} />
      {initialPage?.products?.length && listUrl ? (
        <CatalogItemListJsonLd products={initialPage.products} listUrl={listUrl} />
      ) : null}
      {/* 1. Верхний блок: хлебные крошки */}
      <div className={styles.topSection}>
        <div className={styles.breadcrumbsSection}>
          <Breadcrumbs
            categoryName={displayCategoryName}
            parentCategoryName={parentCategoryName}
            parentCategorySlug={parentCategorySlug}
          />
        </div>
      </div>

      {/* 2. Основной контент - фильтры и товары */}
      <div
        className={`${styles.mainContent} ${!showFilterColumn ? styles.mainContentFullWidth : ''}`}
      >
        {/* Десктоп: боковая панель фильтров */}
        {showFilterColumn ? (
          <aside className={styles.filtersSidebar}>
            <FiltersSidebar
              filters={catalogFilters}
              loading={filtersLoading || hubCategoriesLoading}
              priceBounds={priceBounds}
              categoryOptions={effectiveCategoryOptions}
              parentCategoryRadioMode={isCatalogHub}
              categoryPageBranchMode={isCategoryPage}
              catalogBranchOptions={catalogBranchOptions}
              activeCatalogBranchSlug={activeCatalogBranchSlug}
              catalogBranchRadioGroupSuffix="desktop"
            />
          </aside>
        ) : null}

        {/* Мобильные: оверлей с фильтрами (панель снизу) */}
        {showFilterColumn ? (
          <div
            className={styles.filtersOverlay}
            data-open={mobileFiltersOpen}
            aria-hidden={!mobileFiltersOpen}
          >
            <div className={styles.filtersBackdrop} onClick={() => setMobileFiltersOpen(false)} />
            <div className={styles.filtersDrawer}>
              <FiltersSidebar
                mobileOpen={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
                filters={catalogFilters}
                loading={filtersLoading || hubCategoriesLoading}
                priceBounds={priceBounds}
                categoryOptions={effectiveCategoryOptions}
                parentCategoryRadioMode={isCatalogHub}
                categoryPageBranchMode={isCategoryPage}
                catalogBranchOptions={catalogBranchOptions}
                activeCatalogBranchSlug={activeCatalogBranchSlug}
                catalogBranchRadioGroupSuffix="mobile"
              />
            </div>
          </div>
        ) : null}

        {/* Колонка с товарами или превью хаба */}
        <main className={styles.productsSection}>
          {isHubPreviewMode ? (
            <CatalogHubPreview
              categoryName={displayCategoryName}
              initialPreview={initialHubPreview}
              showMobileFiltersButton={showFilterColumn}
              onMobileFiltersOpen={() => setMobileFiltersOpen(true)}
              onPreviewReady={setCatalogGridReady}
            />
          ) : (
            <ProductsGrid
              categorySlug={categorySlug}
              categoryName={displayCategoryName}
              onTotalPagesChange={setTotalPages}
              onSortChange={goToFirstCatalogPage}
              onProductsPerPageLayoutChange={goToFirstCatalogPage}
              onBasePriceBoundsChange={setPriceBounds}
              onCatalogGridReady={setCatalogGridReady}
              showMobileFiltersButton={showFilterColumn}
              onMobileFiltersOpen={() => setMobileFiltersOpen(true)}
              initialPage={initialPage}
              facetBranchSlug={facetBranchSlug}
            />
          )}
        </main>
      </div>

      {/* 3. Нижний ряд - пагинация */}
      {totalPages > 1 && (
        <div className={styles.paginationSection}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

function CatalogPageFallback() {
  return (
    <div className={styles.catalogPage}>
      <p className={styles.suspenseFallback}>Загрузка каталога…</p>
    </div>
  );
}

export const CatalogPage: React.FC<CatalogPageProps> = (props) => (
  <Suspense fallback={<CatalogPageFallback />}>
    <CatalogPageContent {...props} />
  </Suspense>
);
