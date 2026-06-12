'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ContactFormBlock } from '@/shared/api/contact-form';
import { getContactFormBlock } from '@/shared/api/contact-form';
import type { FeaturedProductsQueryParams } from '@/shared/api/home';
import {
  getFeaturedProducts,
  getFeaturedProductsBlock,
  getHomeDirectionsImages,
  getHomeServices,
  getPartnerProductsCardSettings,
} from '@/shared/api/home';
import type { HomeSectionsVisibility } from '@/shared/api/home-sections';
import { getHomeSectionsVisibility } from '@/shared/api/home-sections';

export const HOME_SECTIONS_VISIBILITY_QUERY_KEY = ['home', 'sections-visibility'] as const;
export const HOME_SERVICES_QUERY_KEY = ['home', 'services'] as const;
export const HOME_DIRECTIONS_IMAGES_QUERY_KEY = ['home', 'directions-images'] as const;
export const HOME_FEATURED_BLOCK_QUERY_KEY = ['home', 'featured-block'] as const;
export const HOME_PARTNER_CARD_SETTINGS_QUERY_KEY = ['home', 'partner-card-settings'] as const;
export const HOME_CONTACT_FORM_BLOCK_QUERY_KEY = ['home', 'contact-form-block'] as const;

export const featuredProductsQueryKey = (params: FeaturedProductsQueryParams) =>
  ['home', 'featured-products', params] as const;

const HOME_STALE_TIME = 60_000;
const HOME_GC_TIME = 5 * 60_000;

export function useHomeSectionsVisibility(initialData?: HomeSectionsVisibility) {
  return useQuery({
    queryKey: HOME_SECTIONS_VISIBILITY_QUERY_KEY,
    queryFn: getHomeSectionsVisibility,
    initialData,
    staleTime: HOME_STALE_TIME,
    gcTime: HOME_GC_TIME,
  });
}

export function useHomeServices() {
  return useQuery({
    queryKey: HOME_SERVICES_QUERY_KEY,
    queryFn: getHomeServices,
    staleTime: HOME_STALE_TIME,
    gcTime: HOME_GC_TIME,
  });
}

export function useHomeDirectionsImages() {
  return useQuery({
    queryKey: HOME_DIRECTIONS_IMAGES_QUERY_KEY,
    queryFn: getHomeDirectionsImages,
    staleTime: HOME_STALE_TIME,
    gcTime: HOME_GC_TIME,
  });
}

export function useFeaturedProductsBlock() {
  return useQuery({
    queryKey: HOME_FEATURED_BLOCK_QUERY_KEY,
    queryFn: getFeaturedProductsBlock,
    staleTime: HOME_STALE_TIME,
    gcTime: HOME_GC_TIME,
  });
}

export function usePartnerProductsCardSettings() {
  return useQuery({
    queryKey: HOME_PARTNER_CARD_SETTINGS_QUERY_KEY,
    queryFn: getPartnerProductsCardSettings,
    staleTime: HOME_STALE_TIME,
    gcTime: HOME_GC_TIME,
  });
}

export function useFeaturedProducts(params: FeaturedProductsQueryParams) {
  return useQuery({
    queryKey: featuredProductsQueryKey(params),
    queryFn: () => getFeaturedProducts(params),
    staleTime: HOME_STALE_TIME,
    gcTime: HOME_GC_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useContactFormBlock(initialData?: ContactFormBlock) {
  return useQuery({
    queryKey: HOME_CONTACT_FORM_BLOCK_QUERY_KEY,
    queryFn: getContactFormBlock,
    initialData,
    staleTime: HOME_STALE_TIME,
    gcTime: HOME_GC_TIME,
  });
}
