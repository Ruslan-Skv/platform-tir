import type { AdminOrderSummary, ServiceOrderSummary } from '@/shared/api/admin-orders';

import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from './orders-page.constants';
import type { OrdersPageOrder } from './orders-page.types';
import type { OrdersListSortBy, OrdersListSortOrder } from './ordersListSort';

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

function managerSortKey(order: OrdersPageOrder): string {
  const mgr = isServiceOrder(order)
    ? order.createdByManager
    : (order as AdminOrderSummary).processedByManager;
  if (!mgr) return '';
  return `${mgr.lastName ?? ''} ${mgr.firstName ?? ''} ${mgr.email ?? ''}`.trim().toLowerCase();
}

function customerSortKey(order: OrdersPageOrder): string {
  if (isServiceOrder(order)) {
    return `${order.customerLastName ?? ''} ${order.customerFirstName ?? ''} ${order.customerEmail ?? ''}`
      .trim()
      .toLowerCase();
  }
  const productOrder = order as AdminOrderSummary;
  const last = productOrder.customerLastName ?? productOrder.user?.lastName ?? '';
  const first = productOrder.customerFirstName ?? productOrder.user?.firstName ?? '';
  const email = productOrder.customerEmail ?? productOrder.user?.email ?? '';
  return `${last} ${first} ${email}`.trim().toLowerCase();
}

function paymentSortKey(order: OrdersPageOrder): string {
  if (isServiceOrder(order) || order.status === 'CANCELLED') return '';
  return ((order as AdminOrderSummary).paymentStatus ?? 'PENDING').toLowerCase();
}

function compareSortValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'ru', { numeric: true, sensitivity: 'base' });
}

/** Client merge-sort for listKind «Все» (product + service pages). */
export function compareOrdersForListSort(
  a: OrdersPageOrder,
  b: OrdersPageOrder,
  sortBy: OrdersListSortBy,
  sortOrder: OrdersListSortOrder
): number {
  let left: string | number;
  let right: string | number;
  switch (sortBy) {
    case 'orderNumber':
      left = a.orderNumber ?? '';
      right = b.orderNumber ?? '';
      break;
    case 'manager':
      left = managerSortKey(a);
      right = managerSortKey(b);
      break;
    case 'customer':
      left = customerSortKey(a);
      right = customerSortKey(b);
      break;
    case 'status':
      left = a.status ?? '';
      right = b.status ?? '';
      break;
    case 'payment':
      left = paymentSortKey(a);
      right = paymentSortKey(b);
      break;
    case 'total':
      left = Number(a.total) || 0;
      right = Number(b.total) || 0;
      break;
    case 'createdAt':
    default:
      left = new Date(a.createdAt).getTime();
      right = new Date(b.createdAt).getTime();
      break;
  }
  const cmp = compareSortValues(left, right);
  return sortOrder === 'asc' ? cmp : -cmp;
}
