import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AdminHubPreviewProductRef {
  id: string;
  name: string;
  sku: string | null;
  isActive: boolean;
}

export interface AdminHubPreviewCategoryOption {
  id: string;
  name: string;
  slug: string;
}

export interface AdminHubPreviewSection {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  sortOrder: number;
  isActive: boolean;
  featuredProducts: AdminHubPreviewProductRef[];
  newProducts: AdminHubPreviewProductRef[];
}

export interface AdminHubPreviewConfig {
  productsPerGroup: number;
  availableCategories: AdminHubPreviewCategoryOption[];
  sections: AdminHubPreviewSection[];
}

export interface AdminHubPreviewSectionInput {
  categoryId: string;
  sortOrder: number;
  isActive: boolean;
  featuredProductIds: string[];
  newProductIds: string[];
}

export async function getAdminCatalogHubPreview(
  headers: Record<string, string>
): Promise<AdminHubPreviewConfig> {
  const res = await apiFetch(`${API_URL}/admin/catalog/hub-preview`, { headers });
  if (!res.ok) {
    throw new Error('Не удалось загрузить настройки превью каталога');
  }
  return res.json() as Promise<AdminHubPreviewConfig>;
}

export async function updateAdminCatalogHubPreview(
  headers: Record<string, string>,
  body: { productsPerGroup: number; sections: AdminHubPreviewSectionInput[] }
): Promise<AdminHubPreviewConfig> {
  const res = await apiFetch(`${API_URL}/admin/catalog/hub-preview`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Не удалось сохранить настройки превью каталога');
  }
  return res.json() as Promise<AdminHubPreviewConfig>;
}
