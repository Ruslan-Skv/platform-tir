'use client';

import { useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { type ResolvePublicOffersParams, resolvePublicOffers } from '@/shared/api/public-offer';

export const APPLICABLE_PUBLIC_OFFERS_QUERY_KEY = ['public-offers', 'resolve'] as const;

const STALE_TIME = 60_000;

export function useApplicablePublicOffers(
  params: ResolvePublicOffersParams,
  options?: { enabled?: boolean }
) {
  const enabled =
    options?.enabled ??
    Boolean(
      params.orderId ||
      params.hasProducts ||
      params.hasServices ||
      (params.productCategoryIds?.length ?? 0) > 0 ||
      (params.serviceCategoryIds?.length ?? 0) > 0
    );

  const queryKey = useMemo(
    () => [
      ...APPLICABLE_PUBLIC_OFFERS_QUERY_KEY,
      params.orderId ?? '',
      params.hasProducts ?? false,
      params.hasServices ?? false,
      ...(params.productCategoryIds ?? []),
      ...(params.serviceCategoryIds ?? []),
    ],
    [
      params.orderId,
      params.hasProducts,
      params.hasServices,
      params.productCategoryIds,
      params.serviceCategoryIds,
    ]
  );

  return useQuery({
    queryKey,
    queryFn: () => resolvePublicOffers(params),
    enabled,
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
  });
}

export function usePublicOfferAcceptance(offers: { id: string }[]) {
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set());
  const offerKey = offers.map((offer) => offer.id).join(',');

  useEffect(() => {
    setAcceptedIds(new Set());
  }, [offerKey]);

  const toggleOffer = (offerId: string, accepted: boolean) => {
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      if (accepted) {
        next.add(offerId);
      } else {
        next.delete(offerId);
      }
      return next;
    });
  };

  const allAccepted = offers.length > 0 && offers.every((offer) => acceptedIds.has(offer.id));

  return { acceptedIds, toggleOffer, allAccepted };
}
