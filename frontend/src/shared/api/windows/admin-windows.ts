import { apiFetch } from '@/shared/lib/api-fetch';

import type { WindowCharacteristicItem } from './windows';

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

export type { WindowCharacteristicItem };

export interface AdminWindowBrand {
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
  _count?: { systems: number };
}

export interface AdminWindowSystem {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  /** Видео системы (Rutube/YouTube/VK или прямой файл) */
  videoUrl: string | null;
  chambers: number | null;
  mountingDepth: number | null;
  glassUnitWidth: string | null;
  thermalResistance: string | null;
  soundInsulation: string | null;
  characteristics: WindowCharacteristicItem[] | null;
  advantages: string[];
  priceFrom: number | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  brand?: { id: string; name: string; slug: string } | null;
}

export interface AdminWindowsSettings {
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
  comparisonShowChambers: boolean;
  comparisonShowDepth: boolean;
  comparisonShowGlass: boolean;
  comparisonShowThermal: boolean;
  comparisonShowSound: boolean;
  ctaBackgroundColor: string | null;
  ctaBackgroundImage: string | null;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string | null;
  ctaShowButtons: boolean;
  updatedAt: string;
}

export interface CreateWindowBrandDto {
  name: string;
  slug: string;
  logoUrl?: string;
  country?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateWindowBrandDto = Partial<CreateWindowBrandDto>;

export interface CreateWindowSystemDto {
  brandId: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  imageUrl?: string;
  /** Видео системы (Rutube/YouTube/VK или прямой файл) */
  videoUrl?: string;
  chambers?: number;
  mountingDepth?: number;
  glassUnitWidth?: string;
  thermalResistance?: string;
  soundInsulation?: string;
  characteristics?: WindowCharacteristicItem[];
  advantages?: string[];
  priceFrom?: number;
  badge?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateWindowSystemDto = Partial<CreateWindowSystemDto>;

export interface UpdateWindowsSettingsDto {
  title?: string;
  subtitle?: string;
  description?: string;
  heroImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  comparisonShow?: boolean;
  comparisonTitle?: string;
  comparisonNote?: string;
  comparisonShowChambers?: boolean;
  comparisonShowDepth?: boolean;
  comparisonShowGlass?: boolean;
  comparisonShowThermal?: boolean;
  comparisonShowSound?: boolean;
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

export async function uploadWindowsImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await apiFetch(`${API_URL}/admin/windows/upload`, {
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

// ===== Бренды =====

export async function getAdminWindowBrands(): Promise<AdminWindowBrand[]> {
  return request<AdminWindowBrand[]>(`${API_URL}/admin/windows/brands`, {
    headers: getAuthHeaders(),
  });
}

export async function getAdminWindowBrand(id: string): Promise<AdminWindowBrand> {
  return request<AdminWindowBrand>(`${API_URL}/admin/windows/brands/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function createWindowBrand(dto: CreateWindowBrandDto): Promise<AdminWindowBrand> {
  return request<AdminWindowBrand>(`${API_URL}/admin/windows/brands`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function updateWindowBrand(
  id: string,
  dto: UpdateWindowBrandDto
): Promise<AdminWindowBrand> {
  return request<AdminWindowBrand>(`${API_URL}/admin/windows/brands/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function deleteWindowBrand(id: string): Promise<void> {
  await request<void>(`${API_URL}/admin/windows/brands/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

// ===== Профильные системы =====

export async function getAdminWindowSystems(brandId?: string): Promise<AdminWindowSystem[]> {
  const query = brandId ? `?brandId=${encodeURIComponent(brandId)}` : '';
  return request<AdminWindowSystem[]>(`${API_URL}/admin/windows/systems${query}`, {
    headers: getAuthHeaders(),
  });
}

export async function getAdminWindowSystem(id: string): Promise<AdminWindowSystem> {
  return request<AdminWindowSystem>(`${API_URL}/admin/windows/systems/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function createWindowSystem(dto: CreateWindowSystemDto): Promise<AdminWindowSystem> {
  return request<AdminWindowSystem>(`${API_URL}/admin/windows/systems`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function updateWindowSystem(
  id: string,
  dto: UpdateWindowSystemDto
): Promise<AdminWindowSystem> {
  return request<AdminWindowSystem>(`${API_URL}/admin/windows/systems/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function deleteWindowSystem(id: string): Promise<void> {
  await request<void>(`${API_URL}/admin/windows/systems/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

// ===== Настройки раздела =====

export async function getAdminWindowsSettings(): Promise<AdminWindowsSettings> {
  return request<AdminWindowsSettings>(`${API_URL}/admin/windows/settings`, {
    headers: getAuthHeaders(),
  });
}

export async function updateWindowsSettings(
  dto: UpdateWindowsSettingsDto
): Promise<AdminWindowsSettings> {
  return request<AdminWindowsSettings>(`${API_URL}/admin/windows/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}
