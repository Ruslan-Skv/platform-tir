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
  createdByManagerId?: string | null;
  customerEmail?: string | null;
  customerFirstName?: string | null;
  customerMiddleName?: string | null;
  customerLastName?: string | null;
  processedByManager?: { id: string; email: string; firstName?: string; lastName?: string };
  user?: { firstName?: string; lastName?: string; email?: string };
  items?: unknown[];
  orderServiceItems?: Array<{
    id: string;
    name: string;
    categoryName: string;
    unit: string;
    quantity: number;
    price: string | number;
    amount: string | number;
  }>;
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
  status?: string,
  options?: {
    hasDelivery?: boolean;
    paymentStatus?: string;
    orderNumber?: string;
    customer?: string;
    manager?: string;
  }
): Promise<{
  data: AdminOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  if (options?.orderNumber) params.set('orderNumber', options.orderNumber);
  if (options?.customer) params.set('customer', options.customer);
  if (options?.manager) params.set('manager', options.manager);
  if (options?.paymentStatus) params.set('paymentStatus', options.paymentStatus);
  if (options?.hasDelivery) params.set('hasDelivery', 'true');
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

export interface SubmitFromCartForCustomerDto {
  customerEmail: string;
  customerFirstName?: string;
  customerMiddleName?: string;
  customerLastName?: string;
  shippingMethodId?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode?: string;
    region?: string;
    country?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  deliveryType?: 'TO_ENTRANCE' | 'TO_APARTMENT';
  deliveryFloor?: number;
  deliveryHasElevator?: boolean;
  distanceKm?: number;
  preferredDeliveryTime?: string;
}

export async function submitOrderFromCartForCustomer(
  dto: SubmitFromCartForCustomerDto
): Promise<AdminOrderSummary & { items?: unknown[] }> {
  const res = await fetch(`${API_URL}/admin/orders/submit-from-cart-for-customer`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось оформить заказ');
  }
  return res.json();
}

export async function sendOrderToCustomerEmail(
  orderId: string
): Promise<{ sent: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/admin/orders/${orderId}/send-to-email`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось отправить');
  }
  return res.json();
}

export interface ServiceOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: string | number;
  customerEmail: string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  createdAt: string;
  createdByManager?: { id: string; email: string; firstName?: string; lastName?: string } | null;
  items: Array<{
    id: string;
    name: string;
    categoryName: string;
    unit: string;
    quantity: number;
    price: string | number;
    amount: string | number;
  }>;
}

export async function getServiceOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: ServiceOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const res = await fetch(`${API_URL}/admin/orders/service-orders?${q}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заказы на услуги');
  return res.json();
}

export async function getServiceOrder(id: string): Promise<ServiceOrderSummary> {
  const res = await fetch(`${API_URL}/admin/orders/service-order/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Заказ на услуги не найден');
  return res.json();
}

export async function updateServiceOrderCustomer(
  id: string,
  data: {
    customerEmail?: string | null;
    customerFirstName?: string | null;
    customerLastName?: string | null;
    customerPhone?: string | null;
  }
): Promise<ServiceOrderSummary> {
  const res = await fetch(`${API_URL}/admin/orders/service-order/${id}/customer`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? 'Не удалось обновить данные покупателя'
    );
  }
  return res.json();
}

export async function updateAdminOrderCustomer(
  orderId: string,
  data: {
    customerEmail?: string | null;
    customerFirstName?: string | null;
    customerMiddleName?: string | null;
    customerLastName?: string | null;
  }
): Promise<AdminOrderSummary & { items?: unknown[] }> {
  const res = await fetch(`${API_URL}/admin/orders/${orderId}/customer`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось обновить покупателя');
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

export async function updateAdminOrderDelivery(
  orderId: string,
  data: {
    shippingCost?: number;
    carryCost?: number | null;
    moversCount?: number | null;
    plannedDeliveryDate?: string | null;
  }
): Promise<AdminOrderSummary & { items?: unknown[] }> {
  const res = await fetch(`${API_URL}/admin/orders/${orderId}/delivery`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? 'Не удалось обновить стоимость доставки'
    );
  }
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

export interface DeliverySettlementDto {
  id: string;
  name: string;
  price: string | number;
  order: number;
}

export type DeliveryPaymentMode = 'WITH_ORDER' | 'ON_SITE';

export interface DeliveryConfigDto {
  id: string;
  deliveryPricePerKmOutside: string | number;
  deliveryPaymentMode: DeliveryPaymentMode | string | null;
  moversPriceMurmansk: string | number;
  moversPriceOutside: string | number;
  moversKgPerPerson: string | number;
  moversVolumePerPerson: string | number | null;
  settlements: DeliverySettlementDto[];
  /** Роли, которым разрешено оформлять заказ для клиента. Только для супер-админа. Может отсутствовать до миграции. */
  rolesAllowedOrderForCustomer?: string[];
}

export async function getDeliveryConfig(): Promise<DeliveryConfigDto> {
  const res = await fetch(`${API_URL}/admin/orders/delivery-config`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки доставки');
  return res.json();
}

export async function updateDeliveryConfig(data: {
  deliveryPricePerKmOutside?: number;
  deliveryPaymentMode?: DeliveryPaymentMode;
  moversPriceMurmansk?: number;
  moversPriceOutside?: number;
  moversKgPerPerson?: number;
  moversVolumePerPerson?: number | null;
  settlements?: Array<{ id?: string; name: string; price: number; order?: number }>;
  /** Только супер-админ может передавать. Роли, которым разрешено оформлять заказ для клиента. */
  rolesAllowedOrderForCustomer?: string[] | null;
}): Promise<DeliveryConfigDto> {
  const res = await fetch(`${API_URL}/admin/orders/delivery-config`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось сохранить настройки доставки');
  return res.json();
}
