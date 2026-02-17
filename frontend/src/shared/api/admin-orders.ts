const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  total: string | number;
  createdAt: string;
  approvedAt?: string | null;
  submittedForReviewAt?: string | null;
  user?: { firstName?: string; lastName?: string; email?: string };
  items?: unknown[];
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getAdminOrders(
  page = 1,
  limit = 10,
  status?: string
): Promise<{
  data: AdminOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  const res = await fetch(`${API_URL}/admin/orders?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заказы');
  return res.json();
}

export async function getAdminOrder(
  id: string
): Promise<AdminOrderSummary & { items?: unknown[] }> {
  const res = await fetch(`${API_URL}/admin/orders/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заказ');
  return res.json();
}

export async function deleteAdminOrder(id: string): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/admin/orders/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось удалить заказ');
  }
  return res.json();
}

export async function updateAdminOrderStatus(
  id: string,
  status: string
): Promise<AdminOrderSummary> {
  const res = await fetch(`${API_URL}/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Не удалось обновить статус');
  return res.json();
}

export interface UpdateOrderItemBody {
  managerComment?: string | null;
  productId?: string;
  quantity?: number;
  replacementNote?: string | null;
}

export async function updateAdminOrderItem(
  orderId: string,
  itemId: string,
  body: UpdateOrderItemBody
): Promise<AdminOrderSummary & { items?: unknown[] }> {
  const res = await fetch(`${API_URL}/admin/orders/${orderId}/items/${itemId}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось обновить пункт заказа');
  }
  return res.json();
}

export async function sendBackOrderToCustomer(
  orderId: string,
  comment?: string
): Promise<AdminOrderSummary & { items?: unknown[] }> {
  const res = await fetch(`${API_URL}/admin/orders/${orderId}/send-back`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ comment: comment || undefined }),
  });
  if (!res.ok) throw new Error('Не удалось отправить заказ на доработку');
  return res.json();
}

export interface ProductForReplacement {
  id: string;
  name: string;
  sku: string | null;
  price: string | number;
}

export async function getProductsForReplacement(search?: string): Promise<ProductForReplacement[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', '80');
  const res = await fetch(`${API_URL}/admin/orders/products-for-replacement?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список товаров');
  return res.json();
}

export interface DeliveryConfigDto {
  id: string;
  deliveryPriceMurmansk: string | number;
  deliveryPricePerKmOutside: string | number;
  moversPriceMurmansk: string | number;
  moversPriceOutside: string | number;
  moversKgPerPerson: string | number;
  moversVolumePerPerson: string | number | null;
}

export async function getDeliveryConfig(): Promise<DeliveryConfigDto> {
  const res = await fetch(`${API_URL}/admin/orders/delivery-config`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки доставки');
  return res.json();
}

export async function updateDeliveryConfig(data: {
  deliveryPriceMurmansk?: number;
  deliveryPricePerKmOutside?: number;
  moversPriceMurmansk?: number;
  moversPriceOutside?: number;
  moversKgPerPerson?: number;
  moversVolumePerPerson?: number | null;
}): Promise<DeliveryConfigDto> {
  const res = await fetch(`${API_URL}/admin/orders/delivery-config`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось сохранить настройки доставки');
  return res.json();
}
