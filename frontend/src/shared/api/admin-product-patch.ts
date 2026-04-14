const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type ProductAttributePayload = { name: string; value: string; slug?: string };

/** Тело для PATCH /products/:id — только цена или полная замена вариантов карточки */
export type ProductPricingPatch =
  | { price: number }
  | {
      cardVariants: Array<{
        name: string;
        price: number;
        image?: string;
        size?: string;
        color?: string;
        extraOption?: string;
        sortOrder?: number;
      }>;
    };

function getBearer(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token') || localStorage.getItem('user_token');
}

export async function patchProductAttributes(
  productId: string,
  attributes: ProductAttributePayload[]
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const token = getBearer();
  if (!token) {
    return { ok: false, message: 'Нет авторизации' };
  }

  const res = await fetch(`${API_URL}/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ attributes }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || `Ошибка сохранения (${res.status})`;
    return { ok: false, message: msg };
  }

  const data = await res.json();
  return { ok: true, data };
}

export async function patchProductPricing(
  productId: string,
  body: ProductPricingPatch
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const token = getBearer();
  if (!token) {
    return { ok: false, message: 'Нет авторизации' };
  }

  const res = await fetch(`${API_URL}/products/${encodeURIComponent(productId)}`, {
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

  const data = await res.json();
  return { ok: true, data };
}

export async function patchProductDescription(
  productId: string,
  description: string | null
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const token = getBearer();
  if (!token) {
    return { ok: false, message: 'Нет авторизации' };
  }

  const res = await fetch(`${API_URL}/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ description: description ?? null }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || `Ошибка сохранения (${res.status})`;
    return { ok: false, message: msg };
  }

  const data = await res.json();
  return { ok: true, data };
}
