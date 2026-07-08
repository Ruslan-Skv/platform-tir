import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type ComponentKind =
  | 'STOIKA_KOROBKI'
  | 'NALICHNIK'
  | 'DOBOR'
  | 'PRITVORNAYA_PLANKA'
  | 'KOROBKA'
  | 'OTHER';

export interface ProductComponent {
  id: string;
  productId: string;
  catalogItemId: string | null;
  kind: ComponentKind;
  name: string;
  type: string;
  size: string | null;
  color: string | null;
  material: string | null;
  price: string;
  image?: string | null;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  kitQuantity: number | null;
  quantityStep: number;
  isFromCatalog: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KitPriceResult {
  canvasPrice: number;
  total: number;
  breakdown: Array<{
    componentId: string | null;
    label: string;
    kind: ComponentKind | 'CANVAS';
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  kitComponents: {
    stoikaKorobka: ProductComponent | null;
    nalichnik: ProductComponent | null;
  };
}

function getAdminBearer(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token') || localStorage.getItem('user_token');
}

export async function getProductComponents(productId: string): Promise<ProductComponent[]> {
  const response = await apiFetch(`${API_URL}/product-components/product/${productId}`);

  if (!response.ok) {
    throw new Error('Не удалось загрузить комплектующие');
  }

  return response.json();
}

export async function getProductKitPrice(
  productId: string,
  canvasPrice?: number
): Promise<KitPriceResult> {
  const params = new URLSearchParams();
  if (canvasPrice != null && Number.isFinite(canvasPrice)) {
    params.set('canvasPrice', String(canvasPrice));
  }
  const qs = params.toString();
  const response = await apiFetch(
    `${API_URL}/product-components/product/${productId}/kit-price${qs ? `?${qs}` : ''}`
  );
  if (!response.ok) {
    throw new Error('Не удалось рассчитать стоимость комплекта');
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

export async function linkProductComponentFromCatalog(
  productId: string,
  catalogItemId: string,
  authHeaders: HeadersInit
): Promise<ProductComponent> {
  const res = await apiFetch(`${API_URL}/product-components/product/${productId}/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ catalogItemId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось привязать комплектующую');
  }
  return res.json();
}

export async function linkProductComponentGroupFromCatalog(
  productId: string,
  groupId: string,
  authHeaders: HeadersInit
): Promise<unknown> {
  const res = await apiFetch(`${API_URL}/product-components/product/${productId}/link-group`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ groupId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось привязать группу');
  }
  return res.json();
}

export async function linkProductComponentsBatchFromCatalog(
  productId: string,
  catalogItemIds: string[],
  authHeaders: HeadersInit
): Promise<ProductComponent[]> {
  const res = await apiFetch(`${API_URL}/product-components/product/${productId}/link-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ catalogItemIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось привязать комплектующие');
  }
  return res.json();
}
