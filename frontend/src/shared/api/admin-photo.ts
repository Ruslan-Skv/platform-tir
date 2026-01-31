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

export interface AdminPhotoCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  order: number;
  _count?: { projects: number };
}

export interface AdminPhoto {
  id: string;
  projectId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPhotoProject {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  displayMode: 'grid' | 'masonry' | 'slider';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string };
  photos: AdminPhoto[];
}

export interface CreatePhotoCategoryDto {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  order?: number;
}

export interface CreatePhotoProjectDto {
  categoryId: string;
  title: string;
  description?: string;
  displayMode?: 'grid' | 'masonry' | 'slider';
  sortOrder?: number;
}

export interface CreatePhotoDto {
  projectId: string;
  imageUrl: string;
  sortOrder?: number;
}

export async function uploadPhoto(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/admin/photo/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка загрузки');
  }
  return res.json();
}

export async function getAdminPhotoCategories(): Promise<AdminPhotoCategory[]> {
  const res = await fetch(`${API_URL}/admin/photo/categories`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить категории');
  return res.json();
}

export async function createPhotoCategory(dto: CreatePhotoCategoryDto) {
  const res = await fetch(`${API_URL}/admin/photo/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка создания');
  }
  return res.json();
}

export async function updatePhotoCategory(id: string, data: Partial<CreatePhotoCategoryDto>) {
  const res = await fetch(`${API_URL}/admin/photo/categories/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка обновления');
  return res.json();
}

export async function deletePhotoCategory(id: string) {
  const res = await fetch(`${API_URL}/admin/photo/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка удаления');
}

export async function getAdminProjects(params?: {
  categoryId?: string;
  categorySlug?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: AdminPhotoProject[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.categorySlug) searchParams.set('categorySlug', params.categorySlug);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/admin/photo/projects?${searchParams}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить объекты');
  return res.json();
}

export async function createPhotoProject(dto: CreatePhotoProjectDto) {
  const res = await fetch(`${API_URL}/admin/photo/projects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка создания');
  }
  return res.json();
}

export async function getAdminProject(id: string): Promise<AdminPhotoProject> {
  const res = await fetch(`${API_URL}/admin/photo/projects/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить объект');
  return res.json();
}

export async function updatePhotoProject(id: string, data: Partial<CreatePhotoProjectDto>) {
  const res = await fetch(`${API_URL}/admin/photo/projects/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка обновления');
  return res.json();
}

export async function deletePhotoProject(id: string) {
  const res = await fetch(`${API_URL}/admin/photo/projects/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка удаления');
}

export async function createPhotos(projectId: string, imageUrls: string[]) {
  const res = await fetch(`${API_URL}/admin/photo/photos/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ projectId, imageUrls }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка добавления фото');
  }
  return res.json();
}

export async function createPhoto(dto: CreatePhotoDto) {
  const res = await fetch(`${API_URL}/admin/photo/photos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка создания');
  }
  return res.json();
}

export async function updatePhoto(id: string, data: Partial<CreatePhotoDto>) {
  const res = await fetch(`${API_URL}/admin/photo/photos/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка обновления');
  return res.json();
}

export async function deletePhoto(id: string) {
  const res = await fetch(`${API_URL}/admin/photo/photos/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка удаления');
}
