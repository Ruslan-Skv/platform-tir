'use client';

import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || fallback);
}

export type MoneyMovement = {
  id: string;
  sourceId: string | null;
  packageId: string | null;
  contractId: string | null;
  paymentDate: string;
  performedAt: string;
  amount: string;
  paymentForm: string;
  paymentType: string;
  addendumNumber: number | null;
  basis: string | null;
  notes: string | null;
  contractNumber: string | null;
  customerName: string | null;
  direction: string | null;
  manager: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type MoneyMovementManagerOption = { id: string; name: string };

export type MoneyMovementListResponse = {
  data: MoneyMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalSum: number;
  managers: MoneyMovementManagerOption[];
};

export async function getMoneyMovements(params?: {
  managerId?: string;
  direction?: string;
  paymentForm?: string;
  paymentType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<MoneyMovementListResponse> {
  const search = new URLSearchParams();
  if (params?.managerId) search.set('managerId', params.managerId);
  if (params?.direction) search.set('direction', params.direction);
  if (params?.paymentForm) search.set('paymentForm', params.paymentForm);
  if (params?.paymentType) search.set('paymentType', params.paymentType);
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.search) search.set('search', params.search);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  const res = await apiFetch(`${API_URL}/admin/money-movements?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить журнал ДП');
  return res.json();
}
