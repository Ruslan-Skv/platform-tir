const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface BlogAuthor {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  order: number;
  _count?: { posts: number };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  status: string;
  publishedAt: string | null;
  author: BlogAuthor;
  category: BlogCategory | null;
  tags: string[];
  viewCount: number;
  likeCount?: number;
  isLiked?: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  allowComments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostWithComments extends BlogPost {
  comments: BlogComment[];
}

export interface BlogComment {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  author: BlogAuthor | null;
  authorName: string | null;
  authorEmail: string | null;
  replies?: BlogComment[];
}

export interface BlogPostsResponse {
  data: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getBlogPosts(params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<BlogPostsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/blog/posts?${searchParams}`);
  if (!res.ok) throw new Error('Не удалось загрузить записи блога');
  return res.json();
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostWithComments> {
  return getBlogPostBySlugWithGuest(slug, typeof window !== 'undefined' ? getGuestId() : undefined);
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
  const res = await fetch(`${API_URL}/blog/categories`);
  if (!res.ok) throw new Error('Не удалось загрузить категории блога');
  return res.json();
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  let guestId = localStorage.getItem('blog_guest_id');
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem('blog_guest_id', guestId);
  }
  return guestId;
}

export async function getBlogPostBySlugWithGuest(
  slug: string,
  guestId?: string
): Promise<BlogPostWithComments> {
  const params = new URLSearchParams();
  if (guestId) params.set('guestId', guestId);
  const url = `${API_URL}/blog/posts/slug/${slug}${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Запись не найдена');
    throw new Error('Не удалось загрузить запись');
  }
  return res.json();
}

export async function toggleBlogPostLike(
  postId: string,
  guestId?: string
): Promise<{ liked: boolean; likeCount: number }> {
  const res = await fetch(`${API_URL}/blog/posts/${postId}/like`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ guestId: guestId || getGuestId() }),
  });
  if (!res.ok) throw new Error('Не удалось поставить лайк');
  return res.json();
}

export interface CreateCommentDto {
  content: string;
  authorName?: string;
  authorEmail?: string;
  parentId?: string;
}

export async function createBlogComment(
  postId: string,
  dto: CreateCommentDto
): Promise<BlogComment> {
  const res = await fetch(`${API_URL}/blog/posts/${postId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить комментарий');
  }
  return res.json();
}
