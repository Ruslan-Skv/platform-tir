import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const ADMIN_PRODUCTS_LIST_QUERY_KEY = 'admin-products-list';
export const ADMIN_PRODUCTS_AUTHORS_QUERY_KEY = 'admin-products-authors';

export interface AdminProductListItem {
  id: string;
  name: string;
  sku: string | null;
  price: number | string;
  comparePrice: number | string | null;
  stock: number;
  category: { id: string; name: string; slug: string };
  manufacturer: { id: string; name: string } | null;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isPartnerProduct?: boolean;
  sortOrder?: number;
  updatedAt?: string;
  attributes?: Record<string, string | number | boolean | string[]> | null;
  images: string[];
  suppliers?: Array<{
    id: string;
    supplierId: string;
    isMainSupplier: boolean;
    supplierSku?: string | null;
    supplierPrice?: string | number;
    supplierProductUrl?: string | null;
    supplierPriceChangedAt?: string | null;
    supplier: {
      id: string;
      legalName: string;
      commercialName?: string | null;
    };
  }>;
  createdBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface AdminProductsListResponse {
  data: AdminProductListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminProductsListParams {
  search?: string;
  categoryId?: string;
  stockFilter?: string;
  createdById?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminProductAuthorOption {
  id: string;
  label: string;
}

export interface MergedCategoryAttribute {
  id: string;
  name: string;
  slug: string;
  type: string;
}

function buildListSearchParams(params: AdminProductsListParams): URLSearchParams {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (params.categoryId) search.set('categoryId', params.categoryId);
  if (params.stockFilter) search.set('stockFilter', params.stockFilter);
  if (params.createdById) search.set('createdById', params.createdById);
  if (params.isActive !== undefined) search.set('isActive', params.isActive ? 'true' : 'false');
  if (params.isFeatured !== undefined) {
    search.set('isFeatured', params.isFeatured ? 'true' : 'false');
  }
  if (params.isNew !== undefined) search.set('isNew', params.isNew ? 'true' : 'false');
  if (params.minPrice !== undefined) search.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) search.set('maxPrice', String(params.maxPrice));
  search.set('page', String(params.page ?? 1));
  search.set('limit', String(params.limit ?? 20));
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  return search;
}

export async function fetchAdminProductsList(
  params: AdminProductsListParams,
  headers?: HeadersInit
): Promise<AdminProductsListResponse> {
  const qs = buildListSearchParams(params).toString();
  const res = await apiFetch(`${API_URL}/admin/catalog/products?${qs}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить товары');
  }
  return res.json();
}

export async function fetchAdminProductAuthors(
  headers?: HeadersInit
): Promise<AdminProductAuthorOption[]> {
  const res = await apiFetch(`${API_URL}/admin/catalog/products/authors`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить авторов');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchMergedCategoryAttributes(
  categoryIds: string[]
): Promise<MergedCategoryAttribute[]> {
  if (categoryIds.length === 0) return [];
  const res = await apiFetch(
    `${API_URL}/categories/attributes/by-categories?ids=${encodeURIComponent(categoryIds.join(','))}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить атрибуты');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function loadProductsListSort(storageKey: string): {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const fallback = { sortBy: 'name', sortOrder: 'asc' as const };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const obj = parsed as Record<string, unknown>;
    const sortBy = typeof obj.sortBy === 'string' ? obj.sortBy : fallback.sortBy;
    const sortOrder = obj.sortOrder === 'desc' ? 'desc' : 'asc';
    return { sortBy, sortOrder };
  } catch {
    return fallback;
  }
}
