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

export interface AdminPromotion {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionDto {
  title: string;
  slug: string;
  imageUrl: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdatePromotionDto {
  title?: string;
  slug?: string;
  imageUrl?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface PromotionsResponse {
  data: AdminPromotion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function uploadPromotionImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/admin/promotions/upload`, {
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

export async function getAdminPromotion(id: string): Promise<AdminPromotion> {
  const res = await fetch(`${API_URL}/admin/promotions/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить акцию');
  return res.json();
}

export async function getAdminPromotions(params?: {
  page?: number;
  limit?: number;
}): Promise<PromotionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const res = await fetch(`${API_URL}/admin/promotions?${searchParams}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить акции');
  return res.json();
}

export async function createPromotion(dto: CreatePromotionDto) {
  const res = await fetch(`${API_URL}/admin/promotions`, {
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

export async function updatePromotion(id: string, dto: UpdatePromotionDto) {
  const res = await fetch(`${API_URL}/admin/promotions/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка обновления');
  }
  return res.json();
}

export async function deletePromotion(id: string) {
  const res = await fetch(`${API_URL}/admin/promotions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка удаления');
  }
}
