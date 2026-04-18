import type { BlogContentAlign, BlogPostBlock } from './blog';

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

/** Для FormData не задаём Content-Type — нужен boundary. */
function getAuthHeadersMultipart(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentAlign: BlogContentAlign;
  excerpt: string | null;
  featuredImage: string | null;
  featuredImageAlt: string;
  badge: string | null;
  readingTimeMinutes: number;
  sortOrder: number;
  authorByline: string | null;
  status: string;
  publishedAt: string | null;
  author: { id: string; firstName: string | null; lastName: string | null };
  category: { id: string; name: string; slug: string } | null;
  tags: string[];
  viewCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  blocks?: BlogPostBlock[];
}

export interface AdminBlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  order: number;
  _count?: { posts: number };
}

export interface CreateBlogPostBlockImageDto {
  url: string;
  alt?: string;
  sortOrder?: number;
}

export interface CreateBlogPostBlockDto {
  bodyHtml: string;
  sortOrder?: number;
  images?: CreateBlogPostBlockImageDto[];
}

export interface CreateBlogPostDto {
  title: string;
  slug: string;
  content: string;
  contentAlign?: BlogContentAlign;
  blocks?: CreateBlogPostBlockDto[];
  excerpt?: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  badge?: string;
  sortOrder?: number;
  authorByline?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categoryId?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface CreateBlogCategoryDto {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  order?: number;
}

export async function getAdminBlogPosts(params?: {
  status?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/admin/blog/posts?${searchParams}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить посты');
  return res.json();
}

export async function getAdminBlogPost(id: string) {
  const res = await fetch(`${API_URL}/admin/blog/posts/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить пост');
  return res.json();
}

export async function createBlogPost(dto: CreateBlogPostDto) {
  const res = await fetch(`${API_URL}/admin/blog/posts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка создания поста');
  }
  return res.json();
}

export async function updateBlogPost(id: string, dto: Partial<CreateBlogPostDto>) {
  const res = await fetch(`${API_URL}/admin/blog/posts/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка обновления поста');
  }
  return res.json();
}

export async function deleteBlogPost(id: string) {
  const res = await fetch(`${API_URL}/admin/blog/posts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка удаления поста');
}

export async function publishBlogPost(id: string) {
  const res = await fetch(`${API_URL}/admin/blog/posts/${id}/publish`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка публикации поста');
  return res.json();
}

export async function getAdminBlogCategories() {
  const res = await fetch(`${API_URL}/admin/blog/categories`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить категории');
  return res.json();
}

export interface BlogBadgePreset {
  id: string;
  label: string;
  sortOrder: number;
  createdAt: string;
}

export async function getBlogBadgePresets(): Promise<BlogBadgePreset[]> {
  const res = await fetch(`${API_URL}/admin/blog/badge-presets`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список плашек');
  return res.json();
}

export async function createBlogBadgePreset(label: string): Promise<BlogBadgePreset> {
  const res = await fetch(`${API_URL}/admin/blog/badge-presets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ label }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось добавить плашку');
  }
  return res.json();
}

export async function uploadBlogFeaturedImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/admin/blog/upload`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить изображение');
  }
  return res.json();
}

export async function createBlogCategory(dto: CreateBlogCategoryDto) {
  const res = await fetch(`${API_URL}/admin/blog/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка создания категории');
  }
  return res.json();
}

export async function updateBlogCategory(id: string, dto: Partial<CreateBlogCategoryDto>) {
  const res = await fetch(`${API_URL}/admin/blog/categories/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Ошибка обновления категории');
  return res.json();
}

export async function deleteBlogCategory(id: string) {
  const res = await fetch(`${API_URL}/admin/blog/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка удаления категории');
}

export async function getAdminBlogStats() {
  const res = await fetch(`${API_URL}/admin/blog/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить статистику');
  return res.json();
}
