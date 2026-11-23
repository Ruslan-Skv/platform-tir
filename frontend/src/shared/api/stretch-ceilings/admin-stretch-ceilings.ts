import { apiFetch } from '@/shared/lib/api-fetch';

import type {
  FabricCharacteristicItem,
  StretchCeilingsFaqItem,
  StretchCeilingsStep,
} from './stretch-ceilings';

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

export type { FabricCharacteristicItem, StretchCeilingsFaqItem, StretchCeilingsStep };

export interface AdminCeilingManufacturer {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { fabrics: number };
}

export interface AdminCeilingFabric {
  id: string;
  manufacturerId: string;
  name: string;
  slug: string;
  textureType: string | null;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  /** Видео о фактуре (Rutube/YouTube/VK или прямой файл) */
  videoUrl: string | null;
  /** Ширина полотна («до 3,2 м», «до 5,1 м бесшовное») */
  width: string | null;
  characteristics: FabricCharacteristicItem[] | null;
  advantages: string[];
  /** Цена «от», ₽/м² */
  priceFrom: number | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  manufacturer?: { id: string; name: string; slug: string } | null;
}

export interface AdminStretchCeilingsSettings {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  comparisonShow: boolean;
  comparisonTitle: string | null;
  comparisonNote: string | null;
  comparisonShowTexture: boolean;
  comparisonShowWidth: boolean;
  comparisonShowPrice: boolean;
  comparisonShowCountry: boolean;
  calcShow: boolean;
  calcTitle: string | null;
  calcNote: string | null;
  calcPricePerMeterBaget: number;
  calcPricePerCorner: number;
  calcPricePerLight: number;
  calcPricePerPipe: number;
  calcLightOptionPrice: number;
  calcCorniceOptionPrice: number;
  calcMinOrder: number;
  steps: StretchCeilingsStep[] | null;
  faq: StretchCeilingsFaqItem[] | null;
  ctaBackgroundColor: string | null;
  ctaBackgroundImage: string | null;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string | null;
  ctaShowButtons: boolean;
  updatedAt: string;
}

export interface CreateCeilingManufacturerDto {
  name: string;
  slug: string;
  logoUrl?: string;
  country?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCeilingManufacturerDto = Partial<CreateCeilingManufacturerDto>;

export interface CreateCeilingFabricDto {
  manufacturerId: string;
  name: string;
  slug: string;
  textureType?: string;
  tagline?: string;
  description: string;
  imageUrl?: string;
  /** Видео о фактуре (Rutube/YouTube/VK или прямой файл) */
  videoUrl?: string;
  width?: string;
  characteristics?: FabricCharacteristicItem[];
  advantages?: string[];
  priceFrom?: number;
  badge?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCeilingFabricDto = Partial<CreateCeilingFabricDto>;

export interface UpdateStretchCeilingsSettingsDto {
  title?: string;
  subtitle?: string;
  description?: string;
  heroImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  comparisonShow?: boolean;
  comparisonTitle?: string;
  comparisonNote?: string;
  comparisonShowTexture?: boolean;
  comparisonShowWidth?: boolean;
  comparisonShowPrice?: boolean;
  comparisonShowCountry?: boolean;
  calcShow?: boolean;
  calcTitle?: string;
  calcNote?: string;
  calcPricePerMeterBaget?: number;
  calcPricePerCorner?: number;
  calcPricePerLight?: number;
  calcPricePerPipe?: number;
  calcLightOptionPrice?: number;
  calcCorniceOptionPrice?: number;
  calcMinOrder?: number;
  steps?: StretchCeilingsStep[];
  faq?: StretchCeilingsFaqItem[];
  ctaBackgroundColor?: string;
  ctaBackgroundImage?: string;
  ctaBackgroundFit?: string;
  ctaBackgroundImageOpacity?: number;
  ctaTextColor?: string;
  ctaShowButtons?: boolean;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка запроса');
  }
  return res.ok && res.status !== 204 ? res.json() : (undefined as T);
}

export async function uploadStretchCeilingsImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await apiFetch(`${API_URL}/admin/stretch-ceilings/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка загрузки');
  }
  return res.json();
}

// ===== Производители полотен =====

export async function getAdminCeilingManufacturers(): Promise<AdminCeilingManufacturer[]> {
  return request<AdminCeilingManufacturer[]>(`${API_URL}/admin/stretch-ceilings/manufacturers`, {
    headers: getAuthHeaders(),
  });
}

export async function getAdminCeilingManufacturer(id: string): Promise<AdminCeilingManufacturer> {
  return request<AdminCeilingManufacturer>(
    `${API_URL}/admin/stretch-ceilings/manufacturers/${id}`,
    { headers: getAuthHeaders() }
  );
}

export async function createCeilingManufacturer(
  dto: CreateCeilingManufacturerDto
): Promise<AdminCeilingManufacturer> {
  return request<AdminCeilingManufacturer>(`${API_URL}/admin/stretch-ceilings/manufacturers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function updateCeilingManufacturer(
  id: string,
  dto: UpdateCeilingManufacturerDto
): Promise<AdminCeilingManufacturer> {
  return request<AdminCeilingManufacturer>(
    `${API_URL}/admin/stretch-ceilings/manufacturers/${id}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    }
  );
}

export async function deleteCeilingManufacturer(id: string): Promise<void> {
  await request<void>(`${API_URL}/admin/stretch-ceilings/manufacturers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

// ===== Фактуры =====

export async function getAdminCeilingFabrics(
  manufacturerId?: string
): Promise<AdminCeilingFabric[]> {
  const query = manufacturerId ? `?manufacturerId=${encodeURIComponent(manufacturerId)}` : '';
  return request<AdminCeilingFabric[]>(`${API_URL}/admin/stretch-ceilings/fabrics${query}`, {
    headers: getAuthHeaders(),
  });
}

export async function getAdminCeilingFabric(id: string): Promise<AdminCeilingFabric> {
  return request<AdminCeilingFabric>(`${API_URL}/admin/stretch-ceilings/fabrics/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function createCeilingFabric(
  dto: CreateCeilingFabricDto
): Promise<AdminCeilingFabric> {
  return request<AdminCeilingFabric>(`${API_URL}/admin/stretch-ceilings/fabrics`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function updateCeilingFabric(
  id: string,
  dto: UpdateCeilingFabricDto
): Promise<AdminCeilingFabric> {
  return request<AdminCeilingFabric>(`${API_URL}/admin/stretch-ceilings/fabrics/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function deleteCeilingFabric(id: string): Promise<void> {
  await request<void>(`${API_URL}/admin/stretch-ceilings/fabrics/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

// ===== Настройки раздела =====

export async function getAdminStretchCeilingsSettings(): Promise<AdminStretchCeilingsSettings> {
  return request<AdminStretchCeilingsSettings>(`${API_URL}/admin/stretch-ceilings/settings`, {
    headers: getAuthHeaders(),
  });
}

export async function updateAdminStretchCeilingsSettings(
  dto: UpdateStretchCeilingsSettingsDto
): Promise<AdminStretchCeilingsSettings> {
  return request<AdminStretchCeilingsSettings>(`${API_URL}/admin/stretch-ceilings/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}
