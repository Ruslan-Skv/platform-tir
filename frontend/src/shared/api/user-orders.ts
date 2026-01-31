const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: string | number;
  size: string | null;
  openingSide: string | null;
  product?: {
    id: string;
    name: string;
    slug: string;
    images?: string[];
  };
}

export interface OrderAddress {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  region: string | null;
  postalCode: string;
  country: string;
}

export interface UserOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: string | number;
  subtotal: string | number;
  tax: string | number;
  shippingCost: string | number;
  paymentStatus: string;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  trackingNumber: string | null;
  items: OrderItem[];
  shippingAddress: OrderAddress;
}

export async function getUserOrders(): Promise<UserOrder[]> {
  const res = await fetch(`${API_URL}/orders`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заказы');
  return res.json();
}

export async function getUserOrder(id: string): Promise<UserOrder> {
  const res = await fetch(`${API_URL}/orders/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заказ');
  return res.json();
}
