import type { AdminOrderSummary } from '@/shared/api/admin-orders';

export type OrderItemDetail = {
  id: string;
  quantity: number;
  price: string | number;
  size?: string | null;
  openingSide?: string | null;
  managerComment?: string | null;
  replacementNote?: string | null;
  replacedFromProductId?: string | null;
  product?: {
    id: string;
    name: string;
    slug?: string;
    sku?: string;
    images?: string[] | null;
  };
  replacedFromProduct?: {
    id: string;
    name: string;
    sku?: string | null;
  } | null;
};

export type ShippingAddress = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string;
};

export type OrderDetail = Omit<AdminOrderSummary, 'items'> & {
  items?: OrderItemDetail[];
  shippingAddressId?: string | null;
  shippingAddress?: ShippingAddress | null;
  shippingCost?: string | number;
  carryCost?: string | number | null;
  moversCount?: number | null;
  plannedDeliveryDate?: string | null;
  deliveryType?: string | null;
  deliveryFloor?: number | null;
  deliveryHasElevator?: boolean | null;
  preferredDeliveryTime?: string | null;
  returnedForCorrectionAt?: string | null;
  returnedForCorrectionComment?: string | null;
  approvedAt?: string | null;
  sentToEmailAt?: string | null;
  customerEmail?: string | null;
  submittedForReviewAt?: string | null;
  cancelledAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  refundedAt?: string | null;
  user?: { id: string; email: string; firstName?: string; lastName?: string; phone?: string };
  processedByManager?: { id: string; email: string; firstName?: string; lastName?: string };
  orderEvents?: Array<{
    id: string;
    createdAt: string;
    type: string;
    actor: string;
    user?: { id: string; email: string; firstName?: string; lastName?: string } | null;
  }>;
  orderServiceItems?: OrderServiceItem[];
};

export type OrderServiceItem = {
  id: string;
  name: string;
  categoryName: string;
  roomName?: string | null;
  unit: string;
  quantity: number;
  price: string | number;
  amount: string | number;
};

export type OrderServiceGroup = {
  categoryName: string;
  rooms: Array<{ roomName: string; items: OrderServiceItem[] }>;
};

export type OrderHistoryEvent = {
  at: string;
  label: string;
  author: string;
  duration?: string;
};
