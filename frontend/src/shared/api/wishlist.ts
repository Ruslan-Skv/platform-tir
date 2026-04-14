import type { CatalogApiProduct } from '@/views/catalog/lib/mapCatalogApiProductToProduct';

import { hasSiteAuthToken } from './compare';

export { hasSiteAuthToken };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** localStorage: id товаров для гостя (как сравнение). */
export const GUEST_WISHLIST_STORAGE_KEY = 'tir_guest_wishlist_product_ids';

const MAX_GUEST_WISHLIST_ITEMS = 500;

interface WishlistItem {
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

export function readGuestWishlistIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}

export function writeGuestWishlistIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(ids));
}

export function clearGuestWishlistIds(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
}

async function fetchWishlistProductsByIds(ids: string[]): Promise<CatalogApiProduct[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 500) {
    chunks.push(unique.slice(i, i + 500));
  }

  const batches = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await fetch(`${API_URL}/products/wishlist-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: chunk }),
      });
      if (!response.ok) {
        throw new Error('Ошибка при загрузке избранного');
      }
      return response.json() as Promise<CatalogApiProduct[]>;
    })
  );

  return batches.flat();
}

export async function getWishlist(): Promise<CatalogApiProduct[]> {
  if (hasSiteAuthToken()) {
    const response = await fetch(`${API_URL}/wishlist`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Необходима авторизация');
      }
      throw new Error('Ошибка при загрузке избранного');
    }

    return response.json();
  }

  const ids = readGuestWishlistIds();
  return fetchWishlistProductsByIds(ids);
}

export async function getWishlistCount(): Promise<number> {
  if (hasSiteAuthToken()) {
    const response = await fetch(`${API_URL}/wishlist/count`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return 0;
      }
      throw new Error('Ошибка при загрузке количества избранного');
    }

    const data = await response.json();
    return typeof data === 'number' ? data : Number(data) || 0;
  }

  return readGuestWishlistIds().length;
}

export async function addToWishlist(productId: string): Promise<WishlistItem> {
  if (!hasSiteAuthToken()) {
    const ids = readGuestWishlistIds();
    if (ids.includes(productId)) {
      throw new Error('Товар уже в избранном');
    }
    if (ids.length >= MAX_GUEST_WISHLIST_ITEMS) {
      throw new Error(`Максимум ${MAX_GUEST_WISHLIST_ITEMS} товаров в избранном`);
    }
    const next = [...ids, productId];
    writeGuestWishlistIds(next);
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

  const response = await fetch(`${API_URL}/wishlist/${productId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 409) {
      throw new Error('Товар уже в избранном');
    }
    throw new Error('Ошибка при добавлении в избранное');
  }

  return response.json();
}

export async function removeFromWishlist(productId: string): Promise<void> {
  if (!hasSiteAuthToken()) {
    writeGuestWishlistIds(readGuestWishlistIds().filter((id) => id !== productId));
    return;
  }

  const response = await fetch(`${API_URL}/wishlist/${productId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Товар не найден в избранном');
    }
    throw new Error('Ошибка при удалении из избранного');
  }
}

export async function checkInWishlist(productId: string): Promise<boolean> {
  if (!hasSiteAuthToken()) {
    return readGuestWishlistIds().includes(productId);
  }

  const response = await fetch(`${API_URL}/wishlist/check/${productId}`, {
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
  return data.isInWishlist;
}
