import { apiFetch } from '@/shared/lib/api-fetch';

import type { BlindsFaqItem, BlindsStep, ProductCharacteristicItem } from './blinds';

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

export type { BlindsFaqItem, BlindsStep, ProductCharacteristicItem };

export interface AdminBlindsCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface AdminBlindsProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  /** Видео об изделии (Rutube/YouTube/VK или прямой файл) */
  videoUrl: string | null;
  /** Способ установки: «На створку», «На проём», «На стену / потолок» */
  mountType: string | null;
  /** Материал полотна или ламелей: «Ткань blackout», «Алюминий 25 мм», «Дерево» */
  material: string | null;
  /** Управление: «Цепочное», «Пружинное», «Электропривод», «Без сверления» */
  controlType: string | null;
  characteristics: ProductCharacteristicItem[] | null;
  advantages: string[];
  /** Цена «от», ₽/м² с монтажом */
  priceFrom: number | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string } | null;
}

export interface AdminBlindsSettings {
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
  comparisonShowMount: boolean;
  comparisonShowMaterial: boolean;
  comparisonShowControl: boolean;
  comparisonShowPrice: boolean;
  calcShow: boolean;
  calcTitle: string | null;
  calcNote: string | null;
  calcMountPrice: number;
  calcMotorPrice: number;
  calcNoDrillPrice: number;
  calcMinOrder: number;
  steps: BlindsStep[] | null;
  faq: BlindsFaqItem[] | null;
  ctaBackgroundColor: string | null;
  ctaBackgroundImage: string | null;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string | null;
  ctaShowButtons: boolean;
  updatedAt: string;
}

export interface CreateBlindsCategoryDto {
  name: string;
  slug: string;
  imageUrl?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateBlindsCategoryDto = Partial<CreateBlindsCategoryDto>;

export interface CreateBlindsProductDto {
  categoryId: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  imageUrl?: string;
  /** Видео об изделии (Rutube/YouTube/VK или прямой файл) */
  videoUrl?: string;
  mountType?: string;
  material?: string;
  controlType?: string;
  characteristics?: ProductCharacteristicItem[];
  advantages?: string[];
  priceFrom?: number;
  badge?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateBlindsProductDto = Partial<CreateBlindsProductDto>;

export interface UpdateBlindsSettingsDto {
  title?: string;
  subtitle?: string;
  description?: string;
  heroImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  comparisonShow?: boolean;
  comparisonTitle?: string;
  comparisonNote?: string;
  comparisonShowMount?: boolean;
  comparisonShowMaterial?: boolean;
  comparisonShowControl?: boolean;
  comparisonShowPrice?: boolean;
  calcShow?: boolean;
  calcTitle?: string;
  calcNote?: string;
  calcMountPrice?: number;
  calcMotorPrice?: number;
  calcNoDrillPrice?: number;
  calcMinOrder?: number;
  steps?: BlindsStep[];
  faq?: BlindsFaqItem[];
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

export async function uploadBlindsImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await apiFetch(`${API_URL}/admin/blinds/upload`, {
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

// ===== Категории изделий =====

export async function getAdminBlindsCategories(): Promise<AdminBlindsCategory[]> {
  return request<AdminBlindsCategory[]>(`${API_URL}/admin/blinds/categories`, {
    headers: getAuthHeaders(),
  });
}

export async function getAdminBlindsCategory(id: string): Promise<AdminBlindsCategory> {
  return request<AdminBlindsCategory>(`${API_URL}/admin/blinds/categories/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function createBlindsCategory(
  dto: CreateBlindsCategoryDto
): Promise<AdminBlindsCategory> {
  return request<AdminBlindsCategory>(`${API_URL}/admin/blinds/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function updateBlindsCategory(
  id: string,
  dto: UpdateBlindsCategoryDto
): Promise<AdminBlindsCategory> {
  return request<AdminBlindsCategory>(`${API_URL}/admin/blinds/categories/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function deleteBlindsCategory(id: string): Promise<void> {
  await request<void>(`${API_URL}/admin/blinds/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

// ===== Изделия =====

export async function getAdminBlindsProducts(categoryId?: string): Promise<AdminBlindsProduct[]> {
  const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  return request<AdminBlindsProduct[]>(`${API_URL}/admin/blinds/products${query}`, {
    headers: getAuthHeaders(),
  });
}

export async function getAdminBlindsProduct(id: string): Promise<AdminBlindsProduct> {
  return request<AdminBlindsProduct>(`${API_URL}/admin/blinds/products/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function createBlindsProduct(
  dto: CreateBlindsProductDto
): Promise<AdminBlindsProduct> {
  return request<AdminBlindsProduct>(`${API_URL}/admin/blinds/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function updateBlindsProduct(
  id: string,
  dto: UpdateBlindsProductDto
): Promise<AdminBlindsProduct> {
  return request<AdminBlindsProduct>(`${API_URL}/admin/blinds/products/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function deleteBlindsProduct(id: string): Promise<void> {
  await request<void>(`${API_URL}/admin/blinds/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

// ===== Настройки раздела =====

export async function getAdminBlindsSettings(): Promise<AdminBlindsSettings> {
  return request<AdminBlindsSettings>(`${API_URL}/admin/blinds/settings`, {
    headers: getAuthHeaders(),
  });
}

export async function updateAdminBlindsSettings(
  dto: UpdateBlindsSettingsDto
): Promise<AdminBlindsSettings> {
  return request<AdminBlindsSettings>(`${API_URL}/admin/blinds/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}
