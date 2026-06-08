'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import * as wishlistApi from '@/shared/api/wishlist';

export const WISHLIST_PRODUCTS_QUERY_KEY = ['wishlist', 'products'] as const;

export function useWishlistProducts() {
  return useQuery({
    queryKey: WISHLIST_PRODUCTS_QUERY_KEY,
    queryFn: () => wishlistApi.getWishlist(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
