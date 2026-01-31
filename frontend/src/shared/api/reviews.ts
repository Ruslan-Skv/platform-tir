const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Review {
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
}

export interface ReviewsSettings {
  id: string;
  enabled: boolean;
  showOnCards: boolean;
  requirePurchase: boolean;
  allowGuestReviews: boolean;
  requireModeration: boolean;
}

export interface CreateReviewDto {
  rating: number;
  comment?: string;
  userName?: string;
  userEmail?: string;
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

export async function getReviewsSettings(): Promise<ReviewsSettings> {
  const res = await fetch(`${API_URL}/reviews/settings`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки отзывов');
  return res.json();
}

export async function getProductReviews(
  productId: string,
  page = 1,
  limit = 10
): Promise<{
  data: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  averageRating: number;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await fetch(`${API_URL}/reviews/product/${productId}?${params}`);
  if (!res.ok) throw new Error('Не удалось загрузить отзывы');
  return res.json();
}

export async function createReview(productId: string, dto: CreateReviewDto): Promise<Review> {
  const res = await fetch(`${API_URL}/reviews/product/${productId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить отзыв');
  }
  return res.json();
}
