'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import * as compareApi from '@/shared/api/compare';

export const COMPARE_PRODUCTS_QUERY_KEY = ['compare', 'products'] as const;

export function useCompareProducts() {
  return useQuery({
    queryKey: COMPARE_PRODUCTS_QUERY_KEY,
    queryFn: () => compareApi.getCompare(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
