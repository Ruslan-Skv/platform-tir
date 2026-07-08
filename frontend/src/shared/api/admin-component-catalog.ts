import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type ComponentKind =
  | 'STOIKA_KOROBKI'
  | 'NALICHNIK'
  | 'DOBOR'
  | 'PRITVORNAYA_PLANKA'
  | 'KOROBKA'
  | 'OTHER';

export const COMPONENT_KIND_LABELS: Record<ComponentKind, string> = {
  STOIKA_KOROBKI: 'Стойка коробки',
  NALICHNIK: 'Наличник',
  DOBOR: 'Добор',
  PRITVORNAYA_PLANKA: 'Притворная планка',
  KOROBKA: 'Коробка',
  OTHER: 'Прочее',
};

export interface AdminComponentCatalogGroupRef {
  group: { id: string; name: string; series: string | null };
}

export interface AdminComponentCatalogItem {
  id: string;
  kind: ComponentKind;
  name: string;
  size: string | null;
  color: string | null;
  material: string | null;
  price: string;
  slug: string;
  image: string | null;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  kitQuantity: number | null;
  quantityStep: number;
  updatedAt?: string;
  groupItems?: AdminComponentCatalogGroupRef[];
  _count?: { productComponents: number };
}

export interface AdminComponentCatalogListResponse {
  data: AdminComponentCatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminComponentCatalogGroupItem {
  id: string;
  sortOrder: number;
  catalogItem: AdminComponentCatalogItem;
}

export interface AdminComponentCatalogGroup {
  id: string;
  name: string;
  series: string | null;
  categoryId: string | null;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  category?: { id: string; name: string; slug: string } | null;
  items: AdminComponentCatalogGroupItem[];
  _count?: { items: number };
}

export interface AdminComponentCatalogGroupsListResponse {
  data: AdminComponentCatalogGroup[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchAdminComponentCatalogList(params?: {
  search?: string;
  kind?: ComponentKind;
  groupId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<AdminComponentCatalogListResponse> {
  const search = new URLSearchParams();
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  if (params?.search?.trim()) search.set('search', params.search.trim());
  if (params?.kind) search.set('kind', params.kind);
  if (params?.groupId) search.set('groupId', params.groupId);
  if (params?.isActive !== undefined) search.set('isActive', params.isActive ? 'true' : 'false');
  if (params?.sortBy) search.set('sortBy', params.sortBy);
  if (params?.sortOrder) search.set('sortOrder', params.sortOrder);

  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog?${search}`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить справочник');
  }
  return res.json();
}

export async function fetchAdminComponentCatalogGroupsList(params?: {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}): Promise<AdminComponentCatalogGroupsListResponse> {
  const search = new URLSearchParams();
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  if (params?.search?.trim()) search.set('search', params.search.trim());
  if (params?.categoryId) search.set('categoryId', params.categoryId);

  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-groups?${search}`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить группы');
  }
  return res.json();
}

export async function createAdminComponentCatalogItem(body: {
  kind: ComponentKind;
  name: string;
  size?: string;
  color?: string;
  material?: string;
  price: number;
  slug: string;
  image?: string;
  stock?: number;
  isActive?: boolean;
  sortOrder?: number;
  kitQuantity?: number | null;
  quantityStep?: number;
}): Promise<AdminComponentCatalogItem> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка создания');
  }
  return res.json();
}

export async function updateAdminComponentCatalogItem(
  id: string,
  body: Partial<{
    kind: ComponentKind;
    name: string;
    size: string;
    color: string;
    material: string;
    price: number;
    slug: string;
    image: string;
    stock: number;
    isActive: boolean;
    sortOrder: number;
    kitQuantity: number | null;
    quantityStep: number;
  }>
): Promise<AdminComponentCatalogItem> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка сохранения');
  }
  return res.json();
}

export async function deleteAdminComponentCatalogItem(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления');
  }
}

export async function createAdminComponentCatalogGroup(body: {
  name: string;
  series?: string;
  categoryId?: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
  catalogItemIds?: string[];
}): Promise<AdminComponentCatalogGroup> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-groups`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка создания группы');
  }
  return res.json();
}

export async function updateAdminComponentCatalogGroup(
  id: string,
  body: Partial<{
    name: string;
    series: string;
    categoryId: string;
    slug: string;
    isActive: boolean;
    sortOrder: number;
    catalogItemIds: string[];
  }>
): Promise<AdminComponentCatalogGroup> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-groups/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка сохранения группы');
  }
  return res.json();
}

export async function setAdminComponentCatalogGroupItems(
  groupId: string,
  catalogItemIds: string[]
): Promise<AdminComponentCatalogGroup> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-groups/${groupId}/items`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ catalogItemIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка обновления состава группы');
  }
  return res.json();
}

export async function addAdminComponentCatalogGroupItem(
  groupId: string,
  catalogItemId: string
): Promise<void> {
  const res = await apiFetch(
    `${API_URL}/admin/catalog/component-catalog-groups/${groupId}/items/${catalogItemId}`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || 'Не удалось добавить позицию в группу'
    );
  }
}

export async function deleteAdminComponentCatalogGroup(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-groups/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления группы');
  }
}

export function formatCatalogItemLabel(
  item: Pick<AdminComponentCatalogItem, 'name' | 'size' | 'color' | 'material'>
): string {
  return [item.name, item.size, item.color, item.material].filter(Boolean).join(', ');
}

/** Slug из названия, размера, цвета и материала — позволяет дублировать название при разном цвете */
export function buildComponentCatalogSlug(fields: {
  name: string;
  size?: string;
  color?: string;
  material?: string;
}): string {
  return slugifyComponentCatalog(
    [fields.name, fields.size, fields.color, fields.material].filter(Boolean).join('-')
  );
}

export function slugifyComponentCatalog(value: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return value
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
