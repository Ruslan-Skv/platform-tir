'use client';

import { FunnelIcon } from '@heroicons/react/24/outline';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useCatalogFilters } from '@/views/catalog/lib/useCatalogFilters';

import { Breadcrumbs } from '../Breadcrumbs';
import { FiltersSidebar } from '../FiltersSidebar';
import { Pagination } from '../Pagination';
import { ProductsGrid } from '../ProductsGrid';
import styles from './CatalogPage.module.css';

export interface CatalogPageProps {
  categorySlug?: string;
  categoryName?: string | null;
  parentCategoryName?: string;
  parentCategorySlug?: string;
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
}) => {
  const displayCategoryName = categoryName || categorySlug || 'Каталог';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** 0 — ещё не получили из сетки; нельзя начинать с 1, иначе при возврате с ?page=N эффект сразу «поджимает» URL к 1 */
  const [totalPages, setTotalPages] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [didRestoreScroll, setDidRestoreScroll] = useState(false);
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(null);

  const pageFromUrl = useMemo(() => readPageFromSearchParams(searchParams), [searchParams]);
  const searchFromUrl = searchParams.get('search') ?? '';
  const prevSearchFromUrlRef = useRef<string | null>(null);

  const {
    filters: catalogFilters,
    loading: filtersLoading,
    hasFacets,
  } = useCatalogFilters(categorySlug);
  const showFilterColumn = Boolean(filtersLoading || hasFacets || priceBounds);

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
      const params = new URLSearchParams(searchParams.toString());
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
    <div className={styles.catalogPage}>
      {/* 1. Верхний блок: крошки + кнопка «Фильтры» (рядом на мобильных) */}
      <div className={styles.topSection}>
        <div className={styles.breadcrumbsSection}>
          <Breadcrumbs
            categoryName={displayCategoryName}
            parentCategoryName={parentCategoryName}
            parentCategorySlug={parentCategorySlug}
          />
        </div>
        {showFilterColumn ? (
          <div className={styles.mobileFiltersRow}>
            <button
              type="button"
              className={styles.mobileFiltersButton}
              onClick={() => setMobileFiltersOpen(true)}
              aria-label="Открыть фильтры"
            >
              <FunnelIcon className={styles.mobileFiltersButtonIcon} />
              Фильтры
            </button>
          </div>
        ) : null}
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
              loading={filtersLoading}
              priceBounds={priceBounds}
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
                loading={filtersLoading}
                priceBounds={priceBounds}
              />
            </div>
          </div>
        ) : null}

        {/* Колонка с товарами */}
        <main className={styles.productsSection}>
          <ProductsGrid
            categorySlug={categorySlug}
            categoryName={displayCategoryName}
            currentPage={currentPage}
            onTotalPagesChange={setTotalPages}
            onSortChange={goToFirstCatalogPage}
            onProductsPerPageLayoutChange={goToFirstCatalogPage}
            catalogFilters={catalogFilters}
            onBasePriceBoundsChange={setPriceBounds}
          />
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
