'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CatalogFiltersResponse } from './catalogFilters.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * @param categorySlug slug страницы каталога или «all»
 * @param facetBranchSlug при «all»: slug родительской категории из ?branch=… — подгрузка фасетов API
 */
export function useCatalogFilters(
  categorySlug: string | undefined,
  facetBranchSlug?: string | null
) {
  const [data, setData] = useState<CatalogFiltersResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const filtersSlug = useMemo(() => {
    if (categorySlug && categorySlug !== 'all') return categorySlug;
    const b = facetBranchSlug?.trim();
    return b ? b : null;
  }, [categorySlug, facetBranchSlug]);

  useEffect(() => {
    if (!filtersSlug) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setData(null);
    setLoading(true);

    fetch(`${API_URL}/products/category/${encodeURIComponent(filtersSlug)}/filters`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: CatalogFiltersResponse | null) => {
        if (!cancelled && json && Array.isArray(json.filters)) {
          setData(json);
        } else if (!cancelled) {
          setData(null);
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filtersSlug]);

  const filters = data?.filters ?? [];
  const hasFacets = filters.length > 0;

  return { filters, branch: data?.branch ?? null, loading, hasFacets };
}
