const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ReviewsBlockSettings {
  id: string;
  enabled: boolean;
  showOnCards: boolean;
  requirePurchase: boolean;
  allowGuestReviews: boolean;
  requireModeration: boolean;
}

export interface AdminReview {
  id: string;
  productId: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; slug: string };
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getAdminReviewsSettings(): Promise<ReviewsBlockSettings> {
  const res = await fetch(`${API_URL}/admin/reviews/settings`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminReviewsSettings(
  data: Partial<ReviewsBlockSettings>
): Promise<ReviewsBlockSettings> {
  const body = {
    enabled: data.enabled,
    showOnCards: data.showOnCards,
    requirePurchase: data.requirePurchase,
    allowGuestReviews: data.allowGuestReviews,
    requireModeration: data.requireModeration,
  };
  const res = await fetch(`${API_URL}/admin/reviews/settings`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.message ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось сохранить настройки';
    throw new Error(message);
  }
  return res.json();
}

export async function getAdminReviews(
  page = 1,
  limit = 20,
  productId?: string,
  isApproved?: boolean
): Promise<{
  data: AdminReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (productId) params.set('productId', productId);
  if (isApproved !== undefined) params.set('isApproved', String(isApproved));
  const res = await fetch(`${API_URL}/admin/reviews?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить отзывы');
  return res.json();
}

export async function approveReview(reviewId: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/catalog/products/reviews/${reviewId}/approve`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось одобрить отзыв');
}

export async function deleteReview(reviewId: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/catalog/products/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить отзыв');
}

export async function replyToReview(reviewId: string, adminReply: string): Promise<AdminReview> {
  const res = await fetch(`${API_URL}/admin/reviews/${reviewId}/reply`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ adminReply }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить ответ');
  }
  return res.json();
}
