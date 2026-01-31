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

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  status: string;
  publishedAt: string | null;
  author: { id: string; firstName: string | null; lastName: string | null };
  category: { id: string; name: string; slug: string } | null;
  tags: string[];
  viewCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  allowComments: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface CreateBlogPostDto {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categoryId?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  allowComments?: boolean;
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

// Admin comments API
export interface AdminBlogComment {
  id: string;
  postId: string;
  authorId: string | null;
  authorName: string | null;
  authorEmail: string | null;
  content: string;
  status: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  post: { id: string; title: string; slug: string };
  author?: { id: string; firstName: string | null; lastName: string | null };
  replies?: AdminBlogComment[];
}

export async function getAdminBlogComments(params?: {
  status?: string;
  postId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: AdminBlogComment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.postId) searchParams.set('postId', params.postId);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/admin/blog/comments?${searchParams}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить комментарии');
  return res.json();
}

export async function approveBlogComment(id: string) {
  const res = await fetch(`${API_URL}/admin/blog/comments/${id}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось одобрить комментарий');
  return res.json();
}

export async function rejectBlogComment(id: string) {
  const res = await fetch(`${API_URL}/admin/blog/comments/${id}/reject`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось отклонить комментарий');
  return res.json();
}

export async function markBlogCommentAsSpam(id: string) {
  const res = await fetch(`${API_URL}/admin/blog/comments/${id}/spam`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось пометить как спам');
  return res.json();
}

export async function deleteBlogComment(id: string) {
  const res = await fetch(`${API_URL}/admin/blog/comments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить комментарий');
}

export async function replyToBlogComment(id: string, content: string): Promise<AdminBlogComment> {
  const res = await fetch(`${API_URL}/admin/blog/comments/${id}/reply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить ответ');
  }
  return res.json();
}
