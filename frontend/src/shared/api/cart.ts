const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface CartItem {
  id: string;
  userId: string;
  productId: string | null;
  componentId: string | null;
  quantity: number;
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
    category: {
      id: string;
      name: string;
      slug: string;
    };
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

export async function getCart(): Promise<CartItem[]> {
  const response = await fetch(`${API_URL}/cart`, {
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
  const response = await fetch(`${API_URL}/cart/count`, {
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

export async function addToCart(productId: string, quantity: number = 1): Promise<CartItem> {
  const response = await fetch(`${API_URL}/cart/${productId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity }),
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

export async function updateCartItemQuantity(
  productId: string,
  quantity: number
): Promise<CartItem> {
  const response = await fetch(`${API_URL}/cart/${productId}`, {
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

export async function removeFromCart(productId: string): Promise<void> {
  const response = await fetch(`${API_URL}/cart/${productId}`, {
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
  const response = await fetch(`${API_URL}/cart`, {
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
  const response = await fetch(`${API_URL}/cart/component/${componentId}`, {
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
  const response = await fetch(`${API_URL}/cart/component/${componentId}`, {
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

export async function removeComponentFromCart(componentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/cart/component/${componentId}`, {
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
