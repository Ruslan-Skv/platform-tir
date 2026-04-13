import type { CatalogApiProduct } from '@/views/catalog/lib/mapCatalogApiProductToProduct';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const GUEST_COMPARE_STORAGE_KEY = 'tir_guest_compare_product_ids';

interface CompareItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number;
    images: string[];
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token') || localStorage.getItem('user_token');
}

export function hasSiteAuthToken(): boolean {
  return !!getAuthToken();
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function readGuestCompareIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_COMPARE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}

export function writeGuestCompareIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_COMPARE_STORAGE_KEY, JSON.stringify(ids));
}

export function clearGuestCompareIds(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_COMPARE_STORAGE_KEY);
}

async function fetchCompareProductsByIds(ids: string[]): Promise<CatalogApiProduct[]> {
  if (ids.length === 0) return [];
  const response = await fetch(`${API_URL}/products/compare-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds: ids }),
  });
  if (!response.ok) {
    throw new Error('Ошибка при загрузке сравнения');
  }
  return response.json();
}

export async function getCompare(): Promise<CatalogApiProduct[]> {
  if (hasSiteAuthToken()) {
    const response = await fetch(`${API_URL}/compare`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Необходима авторизация');
      }
      throw new Error('Ошибка при загрузке сравнения');
    }

    return response.json();
  }

  const ids = readGuestCompareIds();
  return fetchCompareProductsByIds(ids);
}

export async function getCompareCount(): Promise<number> {
  if (hasSiteAuthToken()) {
    const response = await fetch(`${API_URL}/compare/count`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return 0;
      }
      throw new Error('Ошибка при загрузке количества сравнения');
    }

    const data = await response.json();
    return typeof data === 'number' ? data : Number(data) || 0;
  }

  return readGuestCompareIds().length;
}

export async function addToCompare(productId: string): Promise<CompareItem> {
  if (!hasSiteAuthToken()) {
    const ids = readGuestCompareIds();
    if (ids.includes(productId)) {
      throw new Error('Товар уже в сравнении');
    }
    if (ids.length >= 10) {
      throw new Error('Максимум 10 товаров можно сравнить одновременно');
    }
    const next = [...ids, productId];
    writeGuestCompareIds(next);
    return {
      id: `guest-${productId}`,
      userId: 'guest',
      productId,
      createdAt: new Date().toISOString(),
      product: {
        id: productId,
        name: '',
        slug: '',
        price: 0,
        images: [],
        category: { id: '', name: '', slug: '' },
      },
    };
  }

  const response = await fetch(`${API_URL}/compare/${productId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 409) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.message?.includes('Maximum')) {
        throw new Error('Максимум 10 товаров можно сравнить одновременно');
      }
      throw new Error('Товар уже в сравнении');
    }
    throw new Error('Ошибка при добавлении в сравнение');
  }

  return response.json();
}

export async function removeFromCompare(productId: string): Promise<void> {
  if (!hasSiteAuthToken()) {
    writeGuestCompareIds(readGuestCompareIds().filter((id) => id !== productId));
    return;
  }

  const response = await fetch(`${API_URL}/compare/${productId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Товар не найден в сравнении');
    }
    throw new Error('Ошибка при удалении из сравнения');
  }
}

export async function checkInCompare(productId: string): Promise<boolean> {
  if (!hasSiteAuthToken()) {
    return readGuestCompareIds().includes(productId);
  }

  const response = await fetch(`${API_URL}/compare/check/${productId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      return false;
    }
    return false;
  }

  const data = await response.json();
  return data.isInCompare;
}
