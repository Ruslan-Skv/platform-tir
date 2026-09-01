import { apiFetch } from '@/shared/lib/api-fetch';
import { getStoredAccessToken } from '@/shared/lib/auth-session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type HistoryItemType = 'order' | 'service_order' | 'contract' | 'payment';

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
    parentType: 'order' | 'contract_package' | 'contract';
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

function getUserAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = getStoredAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchUserHistory(page = 1, limit = 20): Promise<UserHistoryResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await apiFetch(`${API_URL}/users/me/history?${params}`, {
    headers: getUserAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}
