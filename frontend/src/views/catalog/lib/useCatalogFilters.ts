'use client';

import { useEffect, useState } from 'react';

import type { CatalogFiltersResponse } from './catalogFilters.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useCatalogFilters(categorySlug: string | undefined) {
  const [data, setData] = useState<CatalogFiltersResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!categorySlug || categorySlug === 'all') {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`${API_URL}/products/category/${encodeURIComponent(categorySlug)}/filters`)
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
  }, [categorySlug]);

  const filters = data?.filters ?? [];
  const hasFacets = filters.length > 0;

  return { filters, branch: data?.branch ?? null, loading, hasFacets };
}
