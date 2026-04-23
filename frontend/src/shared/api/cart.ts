import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface CartItem {
  id: string;
  userId: string;
  productId: string | null;
  componentId: string | null;
  cardVariantId: string | null;
  quantity: number;
  size: string | null;
  openingSide: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number;
    images: string[];
    stock?: number;
    onOrder?: boolean;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  } | null;
  cardVariant?: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
    size?: string | null;
    color?: string | null;
    extraOption?: string | null;
  } | null;
  component: {
    id: string;
    name: string;
    type: string;
    price: number;
    image?: string | null;
    product: {
      id: string;
      name: string;
      slug: string;
    };
  } | null;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_token') || localStorage.getItem('admin_token');
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

export async function getCart(): Promise<CartItem[]> {
  const response = await apiFetch(`${API_URL}/cart`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    throw new Error('Ошибка при загрузке корзины');
  }

  return response.json();
}

export async function getCartCount(): Promise<number> {
  const response = await apiFetch(`${API_URL}/cart/count`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      return 0;
    }
    throw new Error('Ошибка при загрузке количества товаров в корзине');
  }

  const data = await response.json();
  // API возвращает число напрямую
  return typeof data === 'number' ? data : Number(data) || 0;
}

export async function addToCart(
  productId: string,
  quantity: number = 1,
  size?: string,
  openingSide?: string,
  cardVariantId?: string
): Promise<CartItem> {
  const response = await apiFetch(`${API_URL}/cart/${productId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity, size, openingSide, cardVariantId }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Товар не найден');
    }
    throw new Error('Ошибка при добавлении в корзину');
  }

  return response.json();
}

export async function updateCartItemQuantityById(
  itemId: string,
  quantity: number
): Promise<CartItem> {
  const response = await apiFetch(`${API_URL}/cart/item/${itemId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity: Number(quantity) }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Элемент корзины не найден');
    }
    throw new Error('Ошибка при обновлении количества');
  }

  return response.json();
}

export async function updateCartItemQuantity(
  productId: string,
  quantity: number
): Promise<CartItem> {
  const response = await apiFetch(`${API_URL}/cart/${productId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity: Number(quantity) }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Товар не найден в корзине');
    }
    throw new Error('Ошибка при обновлении количества');
  }

  return response.json();
}

export async function removeCartItemById(itemId: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/cart/item/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Элемент корзины не найден');
    }
    throw new Error('Ошибка при удалении из корзины');
  }
}

export async function removeFromCart(productId: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/cart/${productId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Товар не найден в корзине');
    }
    throw new Error('Ошибка при удалении из корзины');
  }
}

export async function clearCart(): Promise<void> {
  const response = await apiFetch(`${API_URL}/cart`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    throw new Error('Ошибка при очистке корзины');
  }
}

export async function addComponentToCart(
  componentId: string,
  quantity: number = 1
): Promise<CartItem> {
  const response = await apiFetch(`${API_URL}/cart/component/${componentId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Комплектующее не найдено');
    }
    throw new Error('Ошибка при добавлении в корзину');
  }

  return response.json();
}

export async function updateComponentQuantity(
  componentId: string,
  quantity: number
): Promise<CartItem> {
  const response = await apiFetch(`${API_URL}/cart/component/${componentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity: Number(quantity) }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Комплектующее не найдено в корзине');
    }
    throw new Error('Ошибка при обновлении количества');
  }

  return response.json();
}

export interface CartServiceItem {
  id: string;
  userId: string;
  serviceCatalogCategoryId: string;
  items:
    | { itemId: string; quantity: number }[]
    | { rooms: { name: string; items: { itemId: string; quantity: number }[] }[] };
  rooms?: { name: string; items: { itemId: string; quantity: number }[] }[];
  itemsWithDetails?: {
    itemId: string;
    quantity: number;
    name: string;
    unit: string;
    price?: number;
    amount?: number;
  }[];
  roomsWithDetails?: {
    name: string;
    items: {
      itemId: string;
      quantity: number;
      name: string;
      unit: string;
      price?: number;
      amount?: number;
    }[];
    total: number;
  }[];
  total?: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export async function getCartServiceItems(): Promise<CartServiceItem[]> {
  const response = await apiFetch(`${API_URL}/cart/service-items`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) return [];
    throw new Error('Ошибка при загрузке услуг в корзине');
  }
  return response.json();
}

export async function addServiceToCart(
  categoryId: string,
  payload:
    | { items: { itemId: string; quantity: number }[] }
    | { rooms: { name: string; items: { itemId: string; quantity: number }[] }[] }
): Promise<CartServiceItem> {
  const response = await apiFetch(`${API_URL}/cart/service`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ categoryId, ...payload }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    const err = await response.json().catch(() => ({}));
    const msg = (err as { message?: string | string[] }).message;
    const text = Array.isArray(msg) ? msg.join('; ') : msg || 'Ошибка при добавлении в корзину';
    throw new Error(text);
  }
  return response.json();
}

export async function removeCartServiceItemById(itemId: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/cart/service/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    throw new Error('Ошибка при удалении из корзины');
  }
}

export async function removeComponentFromCart(componentId: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/cart/component/${componentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Необходима авторизация');
    }
    if (response.status === 404) {
      throw new Error('Комплектующее не найдено в корзине');
    }
    throw new Error('Ошибка при удалении из корзины');
  }
}
