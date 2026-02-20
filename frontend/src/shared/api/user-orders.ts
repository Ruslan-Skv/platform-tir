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
  /** Рекомендации менеджера по позиции (замена, количество и т.п.). */
  managerComment?: string | null;
  /** @deprecated Пометка о замене товара (не используется — только комментарий). */
  replacementNote?: string | null;
  /** @deprecated ID товара, который был заменён (не используется). */
  replacedFromProductId?: string | null;
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
  carryCost?: string | number | null;
  moversCount?: number | null;
  paymentStatus: string;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  trackingNumber: string | null;
  approvedAt: string | null;
  items: OrderItem[];
  shippingAddress?: OrderAddress | null;
  deliveryType?: string | null;
  deliveryFloor?: number | null;
  deliveryHasElevator?: boolean | null;
  preferredDeliveryTime?: string | null;
  plannedDeliveryDate?: string | null;
  adminEditedAt?: string | null;
  /** Режим оплаты доставки из настроек (WITH_ORDER | ON_SITE). Приходит с API при запросе заказа. */
  deliveryPaymentMode?: 'WITH_ORDER' | 'ON_SITE';
  /** Когда заказ отправлен на доработку покупателю. */
  returnedForCorrectionAt?: string | null;
  /** Комментарий менеджера при отправке на доработку. */
  returnedForCorrectionComment?: string | null;
}

/** Время действия статуса «Заказ проверен» (минуты). */
export const APPROVAL_VALID_MINUTES = 60;

export function getApprovalRemainingMs(approvedAt: string | null | undefined): number {
  if (!approvedAt) return 0;
  const validUntil = new Date(approvedAt).getTime() + APPROVAL_VALID_MINUTES * 60 * 1000;
  return Math.max(0, validUntil - Date.now());
}

export function formatApprovalCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: string | number;
  freeFromAmount: string | number | null;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  isActive: boolean;
  order: number;
}

export interface DeliverySettlementOption {
  name: string;
  price: number;
}

export type DeliveryPaymentMode = 'WITH_ORDER' | 'ON_SITE';

export interface DeliverySettlementsResponse {
  settlements: DeliverySettlementOption[];
  deliveryPaymentMode: DeliveryPaymentMode;
}

/** Список населённых пунктов и режим оплаты доставки для корзины. */
export async function getDeliverySettlements(): Promise<DeliverySettlementsResponse> {
  const res = await fetch(`${API_URL}/orders/delivery-settlements`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список городов');
  return res.json();
}

/** Список способов доставки для корзины. */
export async function getShippingMethods(): Promise<ShippingMethod[]> {
  const res = await fetch(`${API_URL}/orders/shipping-methods`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить способы доставки');
  return res.json();
}

export type DeliveryType = 'TO_ENTRANCE' | 'TO_APARTMENT';

export interface DeliveryAddressForm {
  street: string;
  city: string;
  postalCode?: string;
  region?: string;
  country?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface CalculateDeliveryResult {
  deliveryCost: number;
  carryCost: number;
  totalShippingCost: number;
}

/** Рассчитать стоимость доставки и подъёма. */
export async function calculateDelivery(params: {
  subtotal: number;
  city: string;
  distanceKm?: number;
  deliveryType: DeliveryType;
  deliveryFloor?: number;
  deliveryHasElevator?: boolean;
}): Promise<CalculateDeliveryResult> {
  const res = await fetch(`${API_URL}/orders/calculate-delivery`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      subtotal: params.subtotal,
      city: params.city.trim(),
      distanceKm: params.distanceKm,
      deliveryType: params.deliveryType,
      deliveryFloor: params.deliveryFloor,
      deliveryHasElevator: params.deliveryHasElevator,
    }),
  });
  if (!res.ok) throw new Error('Не удалось рассчитать доставку');
  return res.json();
}

export interface SubmitFromCartDeliveryPayload {
  deliveryAddress: DeliveryAddressForm;
  deliveryType: DeliveryType;
  deliveryFloor?: number;
  deliveryHasElevator?: boolean;
  distanceKm?: number;
  preferredDeliveryTime?: string;
}

/** Отправить заказ из корзины на проверку менеджеру (статус «На проверке»). */
export async function submitOrderFromCart(
  payload?: { shippingMethodId?: string } | SubmitFromCartDeliveryPayload
): Promise<UserOrder> {
  const body =
    payload && 'deliveryAddress' in payload && payload.deliveryAddress
      ? {
          deliveryAddress: payload.deliveryAddress,
          deliveryType: payload.deliveryType,
          deliveryFloor: payload.deliveryFloor,
          deliveryHasElevator: payload.deliveryHasElevator,
          distanceKm: payload.distanceKm,
          preferredDeliveryTime: payload.preferredDeliveryTime,
        }
      : payload && 'shippingMethodId' in payload && payload.shippingMethodId
        ? { shippingMethodId: payload.shippingMethodId }
        : {};
  const res = await fetch(`${API_URL}/orders/submit-from-cart`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Не удалось отправить заказ на проверку');
  }
  return res.json();
}

/** Отменить проверку заказа (покупатель). Заказ переходит в «Отменён», можно снова отправить корзину или продолжить покупки. */
export async function cancelOrderByCustomer(orderId: string): Promise<UserOrder> {
  const res = await fetch(`${API_URL}/orders/${orderId}/cancel-by-customer`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Не удалось отменить проверку');
  }
  return res.json();
}

/** Добавить позицию из корзины в заказ на проверке. Позиция удаляется из корзины. */
export async function addCartItemToOrder(orderId: string, cartItemId: string): Promise<UserOrder> {
  const res = await fetch(`${API_URL}/orders/${orderId}/add-cart-item`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ cartItemId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Не удалось добавить товар в заказ');
  }
  return res.json();
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

/** Получить заказ по токену из письма (публично, без авторизации). */
export async function getUserOrderByToken(token: string): Promise<UserOrder> {
  const res = await fetch(`${API_URL}/orders/view-by-token?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось загрузить заказ');
  }
  return res.json();
}
