import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminBearer(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token') || localStorage.getItem('user_token');
}

export interface ProductComponent {
  id: string;
  productId: string;
  name: string;
  type: string;
  price: string;
  image?: string | null;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function getProductComponents(productId: string): Promise<ProductComponent[]> {
  const response = await apiFetch(`${API_URL}/product-components/product/${productId}`);

  if (!response.ok) {
    throw new Error('Не удалось загрузить комплектующие');
  }

  return response.json();
}

/** Черновик строки для правки с публичного сайта */
export type PublicComponentDraftRow = {
  id: string;
  name: string;
  type: string;
  price: string;
};

export type PatchProductComponentBody = {
  name: string;
  type: string;
  price: number;
};

export async function patchProductComponent(
  componentId: string,
  body: PatchProductComponentBody
): Promise<{ ok: true; data: ProductComponent } | { ok: false; message: string }> {
  const token = getAdminBearer();
  if (!token) {
    return { ok: false, message: 'Нет авторизации' };
  }

  const res = await apiFetch(`${API_URL}/product-components/${encodeURIComponent(componentId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || `Ошибка сохранения (${res.status})`;
    return { ok: false, message: msg };
  }

  const data = (await res.json()) as ProductComponent;
  return { ok: true, data };
}
