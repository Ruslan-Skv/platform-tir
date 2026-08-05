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

export type JointDirection = 'WINDOWS' | 'DOORS' | 'CEILINGS' | 'BLINDS' | 'REPAIR' | 'FURNITURE';

export type JointItemKind = 'installation' | 'repair' | 'furniture' | 'waybill';

export type JointTimelineItem = {
  id: string;
  kind: JointItemKind;
  direction: JointDirection | 'DELIVERY';
  directionLabel: string;
  title: string;
  status: string;
  statusLabel: string;
  customerName: string | null;
  customerAddress: string | null;
  contractNumber: string | null;
  assigneeName: string | null;
  startDate: string | null;
  endDate: string | null;
  isPoint: boolean;
  href: string;
  note: string | null;
  contractSum: string | number | null;
  deadlineWarning: 'D20' | 'D10' | 'D3' | 'OVERDUE' | null;
  packageId: string | null;
  contractId: string | null;
};

export type JointObjectCluster = {
  id: string;
  label: string;
  customerNames: string[];
  addresses: string[];
  directions: JointDirection[];
  directionLabels: string[];
  itemCount: number;
  deliveryCount: number;
  activeCount: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  items: JointTimelineItem[];
};

export type JointObjectsListResult = {
  objects: JointObjectCluster[];
  totalObjects: number;
  totalItems: number;
  meta: {
    installFrom: string;
    installTo: string;
    waybillFrom: string;
    waybillTo: string;
    includeClosed: boolean;
  };
};

export async function getJointObjects(params?: {
  search?: string;
  includeClosed?: boolean;
}): Promise<JointObjectsListResult> {
  const search = new URLSearchParams();
  if (params?.search?.trim()) search.set('search', params.search.trim());
  if (params?.includeClosed) search.set('includeClosed', '1');
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/joint-objects${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить совместные объекты');
  return res.json();
}
