import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const LEAD_STATUSES = ['new', 'contacted', 'in_progress', 'completed', 'cancelled'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  'form_measurement',
  'form_callback',
  'form_director',
  'form_quote',
  'quiz_mebel',
  'quiz_remont',
  'order',
  'site_feedback',
  'knowledge_feedback',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Новая',
  contacted: 'Связались',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  form_measurement: 'Запись на замер',
  form_callback: 'Обратный звонок',
  form_director: 'Письмо директору',
  form_quote: 'Рассчитать стоимость',
  quiz_mebel: 'Квиз — Мебель',
  quiz_remont: 'Квиз — Ремонт',
  order: 'Заказ из каталога',
  site_feedback: 'Обратная связь (сайт)',
  knowledge_feedback: 'Обратная связь (обучение)',
};

export type UnifiedLeadItem = {
  id: string;
  source: LeadSource;
  sourceLabel: string;
  status: LeadStatus;
  statusEditable: boolean;
  name: string;
  phone: string | null;
  email: string | null;
  preview: string;
  managerNote: string | null;
  createdAt: string;
  updatedAt: string;
  detailUrl: string | null;
  payload: Record<string, unknown>;
};

export type LeadsListResponse = {
  data: UnifiedLeadItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusStats: Record<string, number>;
  sources: { id: LeadSource; label: string }[];
  sourceStats?: Partial<Record<LeadSource, number>>;
};

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getAdminLeads(params?: {
  page?: number;
  limit?: number;
  source?: LeadSource | '';
  status?: LeadStatus | '';
  search?: string;
}): Promise<LeadsListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.source) query.set('source', params.source);
  if (params?.status) query.set('status', params.status);
  if (params?.search?.trim()) query.set('search', params.search.trim());

  const res = await apiFetch(`${API_URL}/admin/leads?${query}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заявки');
  return res.json();
}

export async function getAdminDirectorMessages(params?: {
  page?: number;
  limit?: number;
  status?: LeadStatus | '';
  search?: string;
}): Promise<LeadsListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.search?.trim()) query.set('search', params.search.trim());

  const res = await apiFetch(`${API_URL}/admin/director-messages?${query}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить письма директору');
  return res.json();
}

export async function updateAdminLead(
  leadId: string,
  body: { status?: LeadStatus; managerNote?: string | null }
): Promise<UnifiedLeadItem> {
  const res = await apiFetch(`${API_URL}/admin/leads/${encodeURIComponent(leadId)}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось обновить заявку');
  }
  return res.json();
}

export async function deleteAdminLead(leadId: string): Promise<{ id: string }> {
  const res = await apiFetch(`${API_URL}/admin/leads/${encodeURIComponent(leadId)}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось удалить заявку');
  }
  return res.json();
}

export async function updateAdminDirectorMessage(
  leadId: string,
  body: { status?: LeadStatus; managerNote?: string | null }
): Promise<UnifiedLeadItem> {
  const res = await apiFetch(`${API_URL}/admin/director-messages/${encodeURIComponent(leadId)}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось обновить письмо');
  }
  return res.json();
}

export async function deleteAdminDirectorMessage(leadId: string): Promise<{ id: string }> {
  const res = await apiFetch(`${API_URL}/admin/director-messages/${encodeURIComponent(leadId)}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось удалить письмо');
  }
  return res.json();
}
