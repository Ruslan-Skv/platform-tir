import type { ServiceCatalogHeroNote, ServiceCatalogStep } from '@/shared/api/service-catalog';
import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка запроса');
  }
  return res.ok && res.status !== 204 ? res.json() : (undefined as T);
}

/** Настройки блока «Ремонт квартир» (страница /catalog/services). */
export interface AdminServiceCatalogBlock {
  id: string;
  title: string;
  showPricesInPublic: boolean;
  subtitle: string | null;
  description: string | null;
  heroImageUrl: string | null;
  heroNotes: ServiceCatalogHeroNote[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
  steps: ServiceCatalogStep[] | null;
  seoTextTitle: string | null;
  seoText: string | null;
  ctaTitle: string | null;
  ctaText: string | null;
  ctaBackgroundColor: string | null;
  ctaTextColor: string | null;
  ctaBackgroundImage: string | null;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaShowButtons: boolean;
  updatedAt: string;
}

export interface UpdateServiceCatalogBlockDto {
  title?: string;
  showPricesInPublic?: boolean;
  subtitle?: string | null;
  description?: string | null;
  heroImageUrl?: string | null;
  heroNotes?: ServiceCatalogHeroNote[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  steps?: ServiceCatalogStep[] | null;
  seoTextTitle?: string | null;
  seoText?: string | null;
  ctaTitle?: string | null;
  ctaText?: string | null;
  ctaBackgroundColor?: string | null;
  ctaTextColor?: string | null;
  ctaBackgroundImage?: string | null;
  ctaBackgroundFit?: string;
  ctaBackgroundImageOpacity?: number;
  ctaShowButtons?: boolean;
}

export async function getAdminServiceCatalogBlock(): Promise<AdminServiceCatalogBlock> {
  return request<AdminServiceCatalogBlock>(`${API_URL}/admin/service-catalog/block`, {
    headers: getAuthHeaders(),
  });
}

export async function updateAdminServiceCatalogBlock(
  dto: UpdateServiceCatalogBlockDto
): Promise<AdminServiceCatalogBlock> {
  return request<AdminServiceCatalogBlock>(`${API_URL}/admin/service-catalog/block`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}
