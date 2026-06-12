import type { AdminOrderSummary } from '@/shared/api/admin-orders';

export type ShippingOrder = AdminOrderSummary & {
  shippingAddress?: {
    street?: string;
    city?: string;
    region?: string | null;
    postalCode?: string;
    country?: string;
  } | null;
  shippingCost?: string | number;
  itemsCount?: number;
};

export function formatShippingAddress(order: ShippingOrder): string {
  const addr = order.shippingAddress;
  if (!addr) return '—';
  const parts = [addr.street, addr.city].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}
