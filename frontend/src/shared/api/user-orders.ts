import { apiFetch } from '@/shared/lib/api-fetch';

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
  orderServiceItems?: Array<{
    id: string;
    serviceCatalogItemId: string;
    name: string;
    categoryName: string;
    roomName?: string | null;
    unit: string;
    quantity: number;
    price: string | number;
    amount: string | number;
    serviceCatalogItem?: {
      id: string;
      category?: { slug: string };
    };
  }>;
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
  /** Время действия статуса «Заказ проверен» (минуты). Приходит с API. */
  approvalValidMinutes?: number;
  /** Email покупателя (для заказов менеджера или если указан). */
  customerEmail?: string | null;
  customerFirstName?: string | null;
  customerMiddleName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  /** Пользователь-владелец заказа (при самовыкупе). */
  user?: { id: string; email?: string; firstName?: string; lastName?: string } | null;
  createdByManagerId?: string | null;
  sentToEmailAt?: string | null;
}

/** Значение по умолчанию, если API не вернул approvalValidMinutes. */
export const DEFAULT_APPROVAL_VALID_MINUTES = 60;

export function getApprovalRemainingMs(
  approvedAt: string | null | undefined,
  approvalValidMinutes: number = DEFAULT_APPROVAL_VALID_MINUTES
): number {
  if (!approvedAt) return 0;
  const validUntil = new Date(approvedAt).getTime() + approvalValidMinutes * 60 * 1000;
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
  approvalValidMinutes?: number;
}

/** Список населённых пунктов и режим оплаты доставки для корзины. */
export async function getDeliverySettlements(): Promise<DeliverySettlementsResponse> {
  const res = await apiFetch(`${API_URL}/orders/delivery-settlements`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список городов');
  return res.json();
}

/** Список способов доставки для корзины. */
export async function getShippingMethods(): Promise<ShippingMethod[]> {
  const res = await apiFetch(`${API_URL}/orders/shipping-methods`, {
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
  const res = await apiFetch(`${API_URL}/orders/calculate-delivery`, {
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

export interface SubmitFromCartPayload {
  /** Добавить новые товары к проверенному заказу (вместо создания нового). */
  addToApproved?: boolean;
  /** Добавить новые товары к заказу на проверке (объединить и отправить заново). */
  addToPendingReview?: boolean;
  /** ID позиций корзины для отправки. Обязателен при addToApproved / addToPendingReview. */
  cartItemIds?: string[];
  shippingMethodId?: string;
}

export type SubmitFromCartFullPayload =
  | (SubmitFromCartPayload & SubmitFromCartDeliveryPayload)
  | (SubmitFromCartPayload & { shippingMethodId?: string });

/** Отправить заказ из корзины на проверку менеджеру (статус «На проверке»). */
export async function submitOrderFromCart(payload?: SubmitFromCartFullPayload): Promise<UserOrder> {
  const basePayload =
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
  const body: Record<string, unknown> = {
    ...basePayload,
  };
  if (payload?.cartItemIds && payload.cartItemIds.length > 0) {
    body.cartItemIds = payload.cartItemIds;
  }
  if (payload?.addToApproved === true) {
    body.addToApproved = true;
  }
  if (payload?.addToPendingReview === true) {
    body.addToPendingReview = true;
  }
  const res = await apiFetch(`${API_URL}/orders/submit-from-cart`, {
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
  const res = await apiFetch(`${API_URL}/orders/${orderId}/cancel-by-customer`, {
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
  const res = await apiFetch(`${API_URL}/orders/${orderId}/add-cart-item`, {
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
  const res = await apiFetch(`${API_URL}/orders`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заказы');
  return res.json();
}

export async function getUserOrder(id: string): Promise<UserOrder> {
  const res = await apiFetch(`${API_URL}/orders/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заказ');
  return res.json();
}

/** Получить заказ по токену из письма (публично, без авторизации). */
export async function getUserOrderByToken(token: string): Promise<UserOrder> {
  const res = await apiFetch(`${API_URL}/orders/view-by-token?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось загрузить заказ');
  }
  return res.json();
}

/** Может ли текущий пользователь отправлять заказ на email клиента (только менеджеры). */
export async function canResendOrderToEmail(): Promise<boolean> {
  const res = await apiFetch(`${API_URL}/orders/can-resend-order-to-email`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { canResend?: boolean };
  return !!data.canResend;
}

/** Отправить заказ на email клиента (только для менеджеров, требует авторизацию). */
export async function resendOrderToCustomerEmail(
  token: string
): Promise<{ sent: boolean; error?: string }> {
  const res = await apiFetch(`${API_URL}/orders/resend-to-email`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось отправить');
  }
  return res.json();
}
