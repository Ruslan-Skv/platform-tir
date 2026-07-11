import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AdminComponentCatalogKind {
  id: string;
  code: string;
  name: string;
  slug: string;
  kitQuantity: number | null;
  quantityStep: number;
  sortOrder: number;
  isActive: boolean;
  _count?: { items: number };
}

export interface AdminComponentCatalogKindsResponse {
  data: AdminComponentCatalogKind[];
}

/** @deprecated используйте kindRef.name или getCatalogKindLabel */
export type ComponentKind = string;

export function getCatalogKindLabel(
  kindId: string,
  kinds: AdminComponentCatalogKind[],
  kindRef?: Pick<AdminComponentCatalogKind, 'id' | 'name'> | null
): string {
  if (kindRef?.name) return kindRef.name;
  return kinds.find((k) => k.id === kindId)?.name ?? kindId;
}

export interface AdminComponentCatalogGroupRef {
  group: {
    id: string;
    name: string;
    series: string | null;
    seriesRef?: { id: string; name: string } | null;
  };
}

export interface AdminComponentCatalogSeriesSubgroup {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  _count?: { items: number };
}

export interface AdminComponentCatalogSeries {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  category?: { id: string; name: string; slug: string } | null;
  subgroups?: AdminComponentCatalogSeriesSubgroup[];
  _count?: { subgroups: number };
}

export interface AdminComponentCatalogSeriesListResponse {
  data: AdminComponentCatalogSeries[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminComponentCatalogItem {
  id: string;
  kindId: string;
  kindRef?: Pick<
    AdminComponentCatalogKind,
    'id' | 'code' | 'name' | 'kitQuantity' | 'quantityStep'
  >;
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

export type ComponentCatalogAssignToGroup = {
  id: string;
  name: string;
  seriesSlug?: string;
  seriesName?: string;
};

export interface AdminComponentCatalogGroup {
  id: string;
  seriesId: string;
  name: string;
  series: string | null;
  categoryId: string | null;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  seriesRef?: { id: string; name: string; slug: string };
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
  kindId?: string;
  groupId?: string;
  seriesId?: string;
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
  if (params?.kindId) search.set('kindId', params.kindId);
  if (params?.groupId) search.set('groupId', params.groupId);
  if (params?.seriesId) search.set('seriesId', params.seriesId);
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

export interface AdminComponentCatalogTreeSubgroupItem {
  id: string;
  sortOrder: number;
  catalogItem: AdminComponentCatalogItem;
}

export interface AdminComponentCatalogTreeSubgroup {
  id: string;
  seriesId: string;
  name: string;
  series: string | null;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  itemCount: number;
  productCount: number;
  items: AdminComponentCatalogTreeSubgroupItem[];
}

export interface AdminComponentCatalogTreeSeries {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  subgroupCount: number;
  itemCount: number;
  productCount: number;
  subgroups: AdminComponentCatalogTreeSubgroup[];
}

export interface AdminComponentCatalogTreeResponse {
  series: AdminComponentCatalogTreeSeries[];
  ungroupedItems: AdminComponentCatalogItem[];
}

export async function fetchAdminComponentCatalogTree(params?: {
  search?: string;
  kindId?: string;
  isActive?: boolean;
}): Promise<AdminComponentCatalogTreeResponse> {
  const search = new URLSearchParams();
  if (params?.search?.trim()) search.set('search', params.search.trim());
  if (params?.kindId) search.set('kindId', params.kindId);
  if (params?.isActive !== undefined) search.set('isActive', params.isActive ? 'true' : 'false');

  const qs = search.toString();
  const res = await apiFetch(
    `${API_URL}/admin/catalog/component-catalog/tree${qs ? `?${qs}` : ''}`,
    {
      headers: getAdminAuthHeaders(),
      cache: 'no-store',
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить справочник');
  }
  return res.json();
}

export async function fetchAdminComponentCatalogSeriesList(params?: {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}): Promise<AdminComponentCatalogSeriesListResponse> {
  const search = new URLSearchParams();
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  if (params?.search?.trim()) search.set('search', params.search.trim());
  if (params?.categoryId) search.set('categoryId', params.categoryId);

  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-series?${search}`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить группы моделей');
  }
  return res.json();
}

export async function createAdminComponentCatalogSeries(body: {
  name: string;
  description?: string;
  categoryId?: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<AdminComponentCatalogSeries> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-series`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка создания группы моделей');
  }
  return res.json();
}

export async function updateAdminComponentCatalogSeries(
  id: string,
  body: Partial<{
    name: string;
    description: string;
    categoryId: string;
    slug: string;
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<AdminComponentCatalogSeries> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-series/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка сохранения группы моделей');
  }
  return res.json();
}

export async function deleteAdminComponentCatalogSeries(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-series/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления группы моделей');
  }
}

export async function reorderAdminComponentCatalogSeries(
  items: { id: string; sortOrder: number }[]
): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-series/reorder`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(items),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || 'Ошибка изменения порядка групп моделей'
    );
  }
}

export async function fetchAdminComponentCatalogGroupsList(params?: {
  search?: string;
  categoryId?: string;
  seriesId?: string;
  page?: number;
  limit?: number;
}): Promise<AdminComponentCatalogGroupsListResponse> {
  const search = new URLSearchParams();
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  if (params?.search?.trim()) search.set('search', params.search.trim());
  if (params?.categoryId) search.set('categoryId', params.categoryId);
  if (params?.seriesId) search.set('seriesId', params.seriesId);

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
  kindId: string;
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
    kindId: string;
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
  seriesId: string;
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
    seriesId: string;
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

export async function copyAdminComponentCatalogSubgroup(
  sourceGroupId: string,
  body: {
    name: string;
    color: string;
    variantNote?: string;
    slug?: string;
    priceDelta?: number;
  }
): Promise<AdminComponentCatalogGroup> {
  const res = await apiFetch(
    `${API_URL}/admin/catalog/component-catalog-groups/${sourceGroupId}/copy`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка копирования подгруппы');
  }
  return res.json();
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

export async function reorderAdminComponentCatalogGroups(
  items: { id: string; sortOrder: number }[]
): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-groups/reorder`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(items),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка изменения порядка подгрупп');
  }
}

export async function fetchAdminComponentCatalogKinds(): Promise<AdminComponentCatalogKindsResponse> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-kinds`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить виды');
  }
  return res.json();
}

export async function createAdminComponentCatalogKind(body: {
  name: string;
  code?: string;
  slug?: string;
  kitQuantity?: number | null;
  quantityStep?: number;
  sortOrder?: number;
}): Promise<AdminComponentCatalogKind> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-kinds`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка создания вида');
  }
  return res.json();
}

export async function updateAdminComponentCatalogKind(
  id: string,
  body: Partial<{
    name: string;
    code: string;
    slug: string;
    kitQuantity: number | null;
    quantityStep: number;
    sortOrder: number;
    isActive: boolean;
  }>
): Promise<AdminComponentCatalogKind> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-kinds/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка сохранения вида');
  }
  return res.json();
}

export async function deleteAdminComponentCatalogKind(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/catalog/component-catalog-kinds/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления вида');
  }
}

export function formatCatalogItemLabel(
  item: Pick<AdminComponentCatalogItem, 'name' | 'size' | 'color' | 'material'>
): string {
  return [item.name, item.size, item.color, item.material].filter(Boolean).join(', ');
}

/** Slug из названия, размера, цвета и материала — позволяет дублировать название при разном цвете */
export function buildComponentCatalogSlug(
  fields: {
    name: string;
    size?: string;
    color?: string;
    material?: string;
  },
  seriesSlug?: string
): string {
  const base = slugifyComponentCatalog(
    [fields.name, fields.size, fields.color, fields.material].filter(Boolean).join('-')
  );
  if (!seriesSlug?.trim()) return base;
  return slugifyComponentCatalog(`${seriesSlug.trim()}-${base}`);
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
