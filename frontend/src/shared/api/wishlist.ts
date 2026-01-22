const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

interface Product {
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

export async function getWishlist(): Promise<Product[]> {
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

export async function getWishlistCount(): Promise<number> {
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
  // API возвращает число напрямую
  return typeof data === 'number' ? data : Number(data) || 0;
}

export async function addToWishlist(productId: string): Promise<WishlistItem> {
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
