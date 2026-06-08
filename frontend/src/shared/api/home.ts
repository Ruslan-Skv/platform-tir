import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface HomeServiceItem {
  id: string;
  title: string;
  description: string;
  features: string[];
  price: string;
  imageUrl: string | null;
  sortOrder: number;
}

export interface HomeServicesData {
  block: { title: string; subtitle: string };
  items: HomeServiceItem[];
}

export type FeaturedProductsPrimaryFilter = 'featured' | 'new' | 'featured_or_new' | 'any';
export type FeaturedProductsSecondaryOrder = 'sort_order' | 'created_desc';

export interface FeaturedProductsBlockSettings {
  title: string;
  subtitle: string;
  limit: number;
  primaryFilter: FeaturedProductsPrimaryFilter;
  secondaryOrder: FeaturedProductsSecondaryOrder;
}

export interface PartnerProductsCardSettings {
  partnerLogoUrl: string | null;
  showPartnerIconOnCards: boolean;
}

export interface FeaturedApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: string;
  comparePrice: string | null;
  stock: number;
  onOrder?: boolean;
  isActive: boolean;
  isNew: boolean;
  isFeatured: boolean;
  isPartnerProduct?: boolean;
  images: string[];
  videoUrl?: string | null;
  sortOrder?: number;
  createdAt?: string;
  rating?: number;
  reviewsCount?: number;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  partner?: {
    id: string;
    name: string;
    logoUrl: string | null;
    showLogoOnCards?: boolean;
    tooltipText?: string | null;
    showTooltip?: boolean;
  } | null;
  cardBadgeSelections?: Array<{
    sortOrder: number;
    badge: {
      id: string;
      key: string;
      label: string;
      imageUrl: string | null;
      description?: string | null;
    };
  }>;
}

export async function getHomeServices(): Promise<HomeServicesData> {
  const res = await apiFetch(`${API_URL}/home/services`);
  if (!res.ok) throw new Error('Не удалось загрузить блок услуг');
  return res.json();
}

export async function getHomeDirectionsImages(): Promise<Record<string, string>> {
  const res = await apiFetch(`${API_URL}/home/directions/images`);
  if (!res.ok) throw new Error('Не удалось загрузить изображения направлений');
  const data = await res.json();
  return data && typeof data === 'object' ? data : {};
}

export async function getFeaturedProductsBlock(): Promise<FeaturedProductsBlockSettings> {
  const res = await apiFetch(`${API_URL}/home/featured-products`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки блока товаров');
  return res.json();
}

export async function getPartnerProductsCardSettings(): Promise<PartnerProductsCardSettings> {
  const res = await apiFetch(`${API_URL}/home/partner-products`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки партнёрских товаров');
  const data = await res.json();
  return {
    partnerLogoUrl: data.partnerLogoUrl ?? null,
    showPartnerIconOnCards: data.showPartnerIconOnCards ?? true,
  };
}

export type FeaturedProductsQueryParams = {
  limit: number;
  primaryFilter: FeaturedProductsPrimaryFilter;
  secondaryOrder: FeaturedProductsSecondaryOrder;
};

export async function getFeaturedProducts(
  params: FeaturedProductsQueryParams
): Promise<FeaturedApiProduct[]> {
  const searchParams = new URLSearchParams({
    limit: String(params.limit),
    primaryFilter: params.primaryFilter,
    secondaryOrder: params.secondaryOrder,
  });
  const res = await apiFetch(`${API_URL}/products/featured?${searchParams}`);
  if (!res.ok) throw new Error('Не удалось загрузить популярные товары');
  const data: { products: FeaturedApiProduct[] } = await res.json();
  return data.products ?? [];
}
