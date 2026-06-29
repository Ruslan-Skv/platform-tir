'use client';

import { useQuery } from '@tanstack/react-query';

import { getSellerLegal } from '@/shared/api/seller-legal';

export const SELLER_LEGAL_QUERY_KEY = ['seller-legal'] as const;

const STALE_TIME = 5 * 60_000;

export function useSellerLegal() {
  return useQuery({
    queryKey: SELLER_LEGAL_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getSellerLegal();
      } catch {
        return null;
      }
    },
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
  });
}
