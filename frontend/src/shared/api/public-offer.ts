import { apiFetch } from '@/shared/lib/api-fetch';
import { getAuthHeaders } from '@/shared/lib/auth-session';
import type {
  PublicOfferInfo,
  PublicOfferListItem,
  PublicOfferScopeInfo,
} from '@/shared/lib/legal/public-offer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type { PublicOfferInfo, PublicOfferListItem, PublicOfferScopeInfo };

export type ResolvePublicOffersParams = {
  productCategoryIds?: string[];
  serviceCategoryIds?: string[];
  hasProducts?: boolean;
  hasServices?: boolean;
  orderId?: string | null;
};

export async function listPublicOffers(): Promise<PublicOfferListItem[]> {
  const res = await apiFetch(`${API_URL}/public-offers`);
  if (!res.ok) throw new Error('Не удалось загрузить список оферт');
  return res.json();
}

export async function getPublicOfferBySlug(slug: string): Promise<PublicOfferInfo | null> {
  const res = await apiFetch(`${API_URL}/public-offers/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Не удалось загрузить публичную оферту');
  return res.json();
}

export async function resolvePublicOffers(
  params: ResolvePublicOffersParams
): Promise<PublicOfferInfo[]> {
  const res = await apiFetch(`${API_URL}/public-offers/resolve`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productCategoryIds: params.productCategoryIds ?? [],
      serviceCategoryIds: params.serviceCategoryIds ?? [],
      hasProducts: params.hasProducts,
      hasServices: params.hasServices,
      orderId: params.orderId ?? undefined,
    }),
  });
  if (!res.ok) throw new Error('Не удалось определить оферты');
  return res.json();
}

export async function listAdminPublicOffers(): Promise<PublicOfferInfo[]> {
  const res = await apiFetch(`${API_URL}/admin/settings/public-offers`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить оферты');
  return res.json();
}

export async function getAdminPublicOffer(id: string): Promise<PublicOfferInfo> {
  const res = await apiFetch(`${API_URL}/admin/settings/public-offers/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить оферту');
  return res.json();
}

export async function createAdminPublicOffer(
  data: Partial<PublicOfferInfo> & {
    slug: string;
    pageTitle: string;
    name: string;
    scopes?: PublicOfferScopeInfo[];
  }
): Promise<PublicOfferInfo> {
  const res = await apiFetch(`${API_URL}/admin/settings/public-offers`, {
    method: 'POST',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: data.slug,
      title: data.pageTitle,
      name: data.name,
      offerUrl: data.offerUrl,
      offerContent: data.offerContent,
      acceptText: data.acceptText,
      isPublished: data.isPublished,
      isDefault: data.isDefault,
      sortOrder: data.sortOrder,
      scopes: data.scopes,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка создания');
  }
  return res.json();
}

export async function updateAdminPublicOffer(
  id: string,
  data: Partial<PublicOfferInfo> & { scopes?: PublicOfferScopeInfo[] }
): Promise<PublicOfferInfo> {
  const res = await apiFetch(`${API_URL}/admin/settings/public-offers/${id}`, {
    method: 'PATCH',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: data.slug,
      title: data.pageTitle,
      name: data.name,
      offerUrl: data.offerUrl,
      offerContent: data.offerContent,
      acceptText: data.acceptText,
      isPublished: data.isPublished,
      isDefault: data.isDefault,
      sortOrder: data.sortOrder,
      scopes: data.scopes,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}

export async function deleteAdminPublicOffer(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/settings/public-offers/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка удаления');
  }
}

export async function uploadAdminPublicOfferPdf(
  id: string,
  file: File
): Promise<{ offerUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/settings/public-offers/${id}/upload`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка загрузки PDF');
  }
  return res.json();
}
