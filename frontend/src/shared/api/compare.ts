const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
  stock?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  attributes?: Array<{ name: string; value: string }> | Record<string, unknown> | null;
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

export async function getCompare(): Promise<Product[]> {
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

export async function getCompareCount(): Promise<number> {
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
  // API возвращает число напрямую
  return typeof data === 'number' ? data : Number(data) || 0;
}

export async function addToCompare(productId: string): Promise<CompareItem> {
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
