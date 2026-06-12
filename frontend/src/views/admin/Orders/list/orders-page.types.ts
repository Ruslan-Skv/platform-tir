import type { AdminOrderSummary, ServiceOrderSummary } from '@/shared/api/admin-orders';

export type OrdersPageOrder =
  | (AdminOrderSummary & { itemsCount: number; orderType?: 'product' })
  | (ServiceOrderSummary & { itemsCount: number; orderType: 'service' });
