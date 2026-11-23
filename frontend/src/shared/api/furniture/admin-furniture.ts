import { apiFetch } from '@/shared/lib/api-fetch';

import type {
  FurnitureFaqItem,
  FurnitureMaterialItem,
  FurnitureStep,
  ProductCharacteristicItem,
} from './furniture';

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

export type { FurnitureFaqItem, FurnitureStep, FurnitureMaterialItem, ProductCharacteristicItem };

export interface AdminFurnitureCategory {
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

export interface AdminFurnitureProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  /** Видео об изделии (Rutube/YouTube/VK или прямой файл) */
  videoUrl: string | null;
  /** Конфигурация: «Прямая», «Угловая», «П-образная», «Встроенная», «Корпусная» */
  configuration: string | null;
  /** Материал фасадов: «ЛДСП Egger», «МДФ в плёнке ПВХ», «МДФ эмаль», «Шпон» */
  facadeMaterial: string | null;
  /** Фурнитура: «Blum», «Hettich», «Boyard», «GTV» */
  hardware: string | null;
  characteristics: ProductCharacteristicItem[] | null;
  advantages: string[];
  /** Цена «от», ₽ */
  priceFrom: number | null;
  /** Единица цены: «пог. м» (кухни), «м²», null — за изделие целиком */
  priceUnit: string | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string } | null;
}

export interface AdminFurnitureSettings {
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
  comparisonShowConfiguration: boolean;
  comparisonShowFacade: boolean;
  comparisonShowHardware: boolean;
  comparisonShowPrice: boolean;
  materialsShow: boolean;
  materialsTitle: string | null;
  materials: FurnitureMaterialItem[] | null;
  calcShow: boolean;
  calcTitle: string | null;
  calcNote: string | null;
  calcAssemblyPrice: number;
  calcDeliveryPrice: number;
  calcPremiumHardwarePrice: number;
  calcMinOrder: number;
  steps: FurnitureStep[] | null;
  faq: FurnitureFaqItem[] | null;
  ctaBackgroundColor: string | null;
  ctaBackgroundImage: string | null;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string | null;
  ctaShowButtons: boolean;
  updatedAt: string;
}

export interface CreateFurnitureCategoryDto {
  name: string;
  slug: string;
  imageUrl?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateFurnitureCategoryDto = Partial<CreateFurnitureCategoryDto>;

export interface CreateFurnitureProductDto {
  categoryId: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  imageUrl?: string;
  /** Видео об изделии (Rutube/YouTube/VK или прямой файл) */
  videoUrl?: string;
  configuration?: string;
  facadeMaterial?: string;
  hardware?: string;
  characteristics?: ProductCharacteristicItem[];
  advantages?: string[];
  priceFrom?: number;
  priceUnit?: string;
  badge?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateFurnitureProductDto = Partial<CreateFurnitureProductDto>;

export interface UpdateFurnitureSettingsDto {
  title?: string;
  subtitle?: string;
  description?: string;
  heroImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  comparisonShow?: boolean;
  comparisonTitle?: string;
  comparisonNote?: string;
  comparisonShowConfiguration?: boolean;
  comparisonShowFacade?: boolean;
  comparisonShowHardware?: boolean;
  comparisonShowPrice?: boolean;
  materialsShow?: boolean;
  materialsTitle?: string;
  materials?: FurnitureMaterialItem[];
  calcShow?: boolean;
  calcTitle?: string;
  calcNote?: string;
  calcAssemblyPrice?: number;
  calcDeliveryPrice?: number;
  calcPremiumHardwarePrice?: number;
  calcMinOrder?: number;
  steps?: FurnitureStep[];
  faq?: FurnitureFaqItem[];
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

export async function uploadFurnitureImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await apiFetch(`${API_URL}/admin/furniture/upload`, {
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

export async function getAdminFurnitureCategories(): Promise<AdminFurnitureCategory[]> {
  return request<AdminFurnitureCategory[]>(`${API_URL}/admin/furniture/categories`, {
    headers: getAuthHeaders(),
  });
}

export async function getAdminFurnitureCategory(id: string): Promise<AdminFurnitureCategory> {
  return request<AdminFurnitureCategory>(`${API_URL}/admin/furniture/categories/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function createFurnitureCategory(
  dto: CreateFurnitureCategoryDto
): Promise<AdminFurnitureCategory> {
  return request<AdminFurnitureCategory>(`${API_URL}/admin/furniture/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function updateFurnitureCategory(
  id: string,
  dto: UpdateFurnitureCategoryDto
): Promise<AdminFurnitureCategory> {
  return request<AdminFurnitureCategory>(`${API_URL}/admin/furniture/categories/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function deleteFurnitureCategory(id: string): Promise<void> {
  await request<void>(`${API_URL}/admin/furniture/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

// ===== Изделия =====

export async function getAdminFurnitureProducts(
  categoryId?: string
): Promise<AdminFurnitureProduct[]> {
  const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  return request<AdminFurnitureProduct[]>(`${API_URL}/admin/furniture/products${query}`, {
    headers: getAuthHeaders(),
  });
}

export async function getAdminFurnitureProduct(id: string): Promise<AdminFurnitureProduct> {
  return request<AdminFurnitureProduct>(`${API_URL}/admin/furniture/products/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function createFurnitureProduct(
  dto: CreateFurnitureProductDto
): Promise<AdminFurnitureProduct> {
  return request<AdminFurnitureProduct>(`${API_URL}/admin/furniture/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function updateFurnitureProduct(
  id: string,
  dto: UpdateFurnitureProductDto
): Promise<AdminFurnitureProduct> {
  return request<AdminFurnitureProduct>(`${API_URL}/admin/furniture/products/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}

export async function deleteFurnitureProduct(id: string): Promise<void> {
  await request<void>(`${API_URL}/admin/furniture/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

// ===== Настройки раздела =====

export async function getAdminFurnitureSettings(): Promise<AdminFurnitureSettings> {
  return request<AdminFurnitureSettings>(`${API_URL}/admin/furniture/settings`, {
    headers: getAuthHeaders(),
  });
}

export async function updateAdminFurnitureSettings(
  dto: UpdateFurnitureSettingsDto
): Promise<AdminFurnitureSettings> {
  return request<AdminFurnitureSettings>(`${API_URL}/admin/furniture/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
}
