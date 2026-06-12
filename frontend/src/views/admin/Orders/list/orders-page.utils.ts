import type { ServiceOrderSummary } from '@/shared/api/admin-orders';

import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from './orders-page.constants';
import type { OrdersPageOrder } from './orders-page.types';

export function formatOrderCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatOrderDate(dateString: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] || status;
}

export function isServiceOrder(
  order: OrdersPageOrder
): order is ServiceOrderSummary & { itemsCount: number; orderType: 'service' } {
  return order.orderType === 'service';
}

export function getOrderDetailUrl(order: OrdersPageOrder): string {
  return isServiceOrder(order)
    ? `/admin/orders/service-orders/${order.id}`
    : `/admin/orders/${order.id}`;
}
