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

function getAuthHeadersMultipart(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type KnowledgeMaterialType = 'ARTICLE' | 'VIDEO' | 'LINK';
export type KnowledgeMaterialStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface KnowledgeAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  sortOrder: number;
}

export interface KnowledgeVideoProgress {
  id: string;
  progressPercent: number;
  positionSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export interface AdminKnowledgeMaterial {
  id: string;
  categoryId: string;
  type: KnowledgeMaterialType;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  videoUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  isPinned: boolean;
  status: KnowledgeMaterialStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string | null; lastName: string | null };
  category: { id: string; name: string; slug: string };
  attachments?: KnowledgeAttachment[];
  myVideoProgress?: KnowledgeVideoProgress | null;
}

export interface KnowledgeAttachmentInput {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  sortOrder?: number;
}

export interface AdminKnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  order: number;
  _count?: { materials: number };
}

export interface CreateKnowledgeMaterialDto {
  categoryId: string;
  type: KnowledgeMaterialType;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  videoUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  sortOrder?: number;
  isPinned?: boolean;
  status?: KnowledgeMaterialStatus;
  attachments?: KnowledgeAttachmentInput[];
}

export interface CreateKnowledgeCategoryDto {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  order?: number;
}

export interface KnowledgeStats {
  totalMaterials: number;
  publishedMaterials: number;
  draftMaterials: number;
  videoCount: number;
  articleCount: number;
  linkCount: number;
  categoryCount: number;
  pinnedCount: number;
}

export async function getKnowledgeMaterials(params?: {
  status?: string;
  categoryId?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const res = await apiFetch(`${API_URL}/admin/knowledge/materials?${searchParams}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить материалы');
  return res.json() as Promise<{
    data: AdminKnowledgeMaterial[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

export async function getKnowledgeMaterial(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Материал не найден');
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function createKnowledgeMaterial(dto: CreateKnowledgeMaterialDto) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать материал');
  }
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function updateKnowledgeMaterial(
  id: string,
  dto: Partial<CreateKnowledgeMaterialDto>
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось обновить материал');
  }
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function publishKnowledgeMaterial(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}/publish`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось опубликовать материал');
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function deleteKnowledgeMaterial(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить материал');
}

export async function getKnowledgeCategories() {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить категории');
  return res.json() as Promise<AdminKnowledgeCategory[]>;
}

export async function createKnowledgeCategory(dto: CreateKnowledgeCategoryDto) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать категорию');
  }
  return res.json() as Promise<AdminKnowledgeCategory>;
}

export async function updateKnowledgeCategory(
  id: string,
  dto: Partial<CreateKnowledgeCategoryDto>
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Не удалось обновить категорию');
  return res.json() as Promise<AdminKnowledgeCategory>;
}

export async function deleteKnowledgeCategory(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить категорию');
}

export async function getKnowledgeStats() {
  const res = await apiFetch(`${API_URL}/admin/knowledge/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить статистику');
  return res.json() as Promise<KnowledgeStats>;
}

export async function uploadKnowledgeThumbnail(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/knowledge/upload`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });
  if (!res.ok) throw new Error('Не удалось загрузить изображение');
  return res.json() as Promise<{ imageUrl: string }>;
}

export async function uploadKnowledgeAttachment(file: File): Promise<{
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/knowledge/upload-attachment`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });
  if (!res.ok) throw new Error('Не удалось загрузить файл');
  return res.json();
}

export async function toggleKnowledgeMaterialPin(id: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${id}/pin`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось изменить закрепление');
  return res.json() as Promise<AdminKnowledgeMaterial>;
}

export async function updateKnowledgeVideoProgress(
  materialId: string,
  data: { progressPercent: number; positionSeconds?: number; completed?: boolean }
) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/progress`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось сохранить прогресс');
  return res.json() as Promise<KnowledgeVideoProgress>;
}

export async function getKnowledgeVideoProgress(materialId: string) {
  const res = await apiFetch(`${API_URL}/admin/knowledge/materials/${materialId}/progress`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Не удалось загрузить прогресс');
  const data = await res.json();
  return data as KnowledgeVideoProgress | null;
}
