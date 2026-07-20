'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { CatalogHubPreviewResponse } from '@/shared/api/catalog-hub-preview';
import type { PublicCatalogPageResponse } from '@/shared/api/public-catalog-list';
import {
  readCatalogScrollRestore,
  restoreCatalogScrollPosition,
} from '@/shared/lib/catalog/catalog-scroll-restore';
import type { CategoryFilterOption } from '@/views/catalog/lib/buildCategoryFilterOptions';
import { parseCatalogSearchParams } from '@/views/catalog/lib/catalog-search-params';
import { newURLSearchParamsLive } from '@/views/catalog/lib/newURLSearchParamsLive';
import { resolveActiveCatalogBranchSlug } from '@/views/catalog/lib/resolve-active-catalog-branch-slug';
import { useCatalogFilters } from '@/views/catalog/lib/useCatalogFilters';
import { useCatalogHubCategories } from '@/views/catalog/lib/useCatalogHubCategories';
import { useCatalogProductsPerPage } from '@/views/catalog/lib/useCatalogProductsPerPage';

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

export function useCatalogPage({
  categorySlug,
  categoryName,
  parentCategoryName,
  parentCategorySlug,
  initialPage = null,
  initialHubCategories = null,
  initialHubPreview = null,
  listUrl,
}: CatalogPageProps) {
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
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(null);
  const [catalogGridReady, setCatalogGridReady] = useState(() =>
    Boolean(initialPage?.products?.length && !(isCatalogHub && !searchParams.get('branch')?.trim()))
  );

  const pageFromUrl = useMemo(() => readPageFromSearchParams(searchParams), [searchParams]);
  const searchFromUrl = searchParams.get('search') ?? '';
  const prevSearchFromUrlRef = useRef<string | null>(null);

  const facetBranchSlug = isCatalogHub ? searchParams.get('branch')?.trim() || null : null;
  const isHubPreviewMode = isCatalogHub && !facetBranchSlug;

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
    () =>
      categoryFilterOptions.filter((o) => o.depth === 1).map((o) => ({ ...o, depth: 0 as const })),
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

  useLayoutEffect(() => {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    const saved = readCatalogScrollRestore(catalogUrlKey);
    if (!saved) return;
    // До paint: хотя бы Y, чтобы Back не мелькал с верха страницы.
    window.scrollTo({ top: saved.y, behavior: 'auto' });
  }, [catalogUrlKey]);

  useEffect(() => {
    const saved = readCatalogScrollRestore(catalogUrlKey);
    if (!saved) return;
    if (!catalogGridReady) return;

    let cancelled = false;
    let settleCleanup: (() => void) | undefined;
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (cancelled) return;
        // Якорь по карточке + удержание при CLS (картинки/колонки на проде).
        settleCleanup = restoreCatalogScrollPosition({
          urlKey: catalogUrlKey,
          settleMs: 1000,
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(outerRaf);
      if (innerRaf) cancelAnimationFrame(innerRaf);
      settleCleanup?.();
    };
  }, [catalogUrlKey, catalogGridReady]);

  const handlePageChange = (page: number) => {
    replacePageInUrl(page, true);
  };

  const goToFirstCatalogPage = () => {
    replacePageInUrl(1, false);
  };

  return {
    displayCategoryName,
    parentCategoryName,
    parentCategorySlug,
    categorySlug,
    initialPage,
    initialHubPreview,
    listUrl,
    hideMobileBreadcrumbs,
    catalogUrlKey,
    showFilterColumn,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    catalogFilters,
    filtersLoading,
    hubCategoriesLoading,
    priceBounds,
    effectiveCategoryOptions,
    isCatalogHub,
    isCategoryPage,
    catalogBranchOptions,
    activeCatalogBranchSlug,
    isHubPreviewMode,
    facetBranchSlug,
    totalPages,
    currentPage,
    handlePageChange,
    setTotalPages,
    goToFirstCatalogPage,
    setPriceBounds,
    setCatalogGridReady,
  };
}

export type CatalogPageModel = ReturnType<typeof useCatalogPage>;
