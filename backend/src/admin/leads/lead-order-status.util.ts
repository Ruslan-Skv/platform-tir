import { OrderStatus } from '@prisma/client';

import type { LeadStatus } from './lead.types';

export function orderStatusToLeadStatus(status: OrderStatus): LeadStatus {
  switch (status) {
    case OrderStatus.PENDING:
    case OrderStatus.PENDING_REVIEW:
      return 'new';
    case OrderStatus.RETURNED_FOR_CORRECTION:
      return 'contacted';
    case OrderStatus.APPROVED:
    case OrderStatus.PROCESSING:
    case OrderStatus.SHIPPED:
      return 'in_progress';
    case OrderStatus.DELIVERED:
      return 'completed';
    case OrderStatus.CANCELLED:
    case OrderStatus.REFUNDED:
      return 'cancelled';
    default:
      return 'new';
  }
}

export function leadStatusToOrderFilter(status: LeadStatus): OrderStatus[] {
  switch (status) {
    case 'new':
      return [OrderStatus.PENDING, OrderStatus.PENDING_REVIEW];
    case 'contacted':
      return [OrderStatus.RETURNED_FOR_CORRECTION];
    case 'in_progress':
      return [OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.SHIPPED];
    case 'completed':
      return [OrderStatus.DELIVERED];
    case 'cancelled':
      return [OrderStatus.CANCELLED, OrderStatus.REFUNDED];
    default:
      return [];
  }
}
