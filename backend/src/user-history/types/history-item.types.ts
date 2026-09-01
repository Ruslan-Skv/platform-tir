export type HistoryItemType = 'order' | 'service_order' | 'contract' | 'payment';

export type HistoryPaymentParentType = 'order' | 'contract_package' | 'contract';

export interface HistoryOrderItemPreview {
  id: string;
  name: string;
  quantity: number;
}

export interface HistoryItemBase {
  id: string;
  type: HistoryItemType;
  occurredAt: string;
  title: string;
  subtitle?: string | null;
  amount?: number | null;
  status?: string | null;
  statusLabel?: string | null;
}

export interface HistoryOrderItem extends HistoryItemBase {
  type: 'order';
  meta: {
    orderId: string;
    orderNumber: string;
    paymentStatus: string;
    itemsPreview: HistoryOrderItemPreview[];
    itemsTotal: number;
  };
}

export interface HistoryServiceOrderItem extends HistoryItemBase {
  type: 'service_order';
  meta: {
    serviceOrderId: string;
    orderNumber: string;
  };
}

export interface HistoryContractItem extends HistoryItemBase {
  type: 'contract';
  meta: {
    packageId: string;
    kind: string;
    signUrl?: string | null;
    contractNumber?: string | null;
  };
}

export interface HistoryPaymentItem extends HistoryItemBase {
  type: 'payment';
  meta: {
    paymentId: string;
    paymentSource: 'order' | 'contract_package' | 'contract';
    parentType: HistoryPaymentParentType;
    parentId: string;
    parentLabel: string;
    paymentType?: string | null;
    paymentForm?: string | null;
  };
}

export type HistoryItem =
  | HistoryOrderItem
  | HistoryServiceOrderItem
  | HistoryContractItem
  | HistoryPaymentItem;

export interface UserHistoryResponse {
  data: HistoryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
