import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.message === 'string'
        ? err.message
        : Array.isArray(err.message)
          ? err.message.join(', ')
          : fallbackMessage
    );
  }
  return res.json() as Promise<T>;
}

export interface MarketingStrategy {
  id: string;
  title: string;
  summary: string | null;
  goals: string | null;
  notes: string | null;
  monthlyBudgetTotal: number | null;
  monthlyBudgetNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingChannel {
  id: string;
  name: string;
  code: string;
  priority: number;
  monthlyBudget: number | null;
  budgetSharePercent: number | null;
  role: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingChannelStat {
  channel: {
    id: string;
    name: string;
    code: string;
    priority: number;
    monthlyBudget: number | null;
    budgetSharePercent: number | null;
    role: string | null;
  };
  visits: number;
  leads: number;
  orders: number;
  revenue: number;
  cost: number;
  roi: number;
  conversionRate: number;
  cpl: number;
  plannedVsActual: {
    planned: number;
    actual: number;
    delta: number;
    utilizationPercent: number | null;
  } | null;
}

export interface MarketingOverview {
  strategy: MarketingStrategy;
  channels: MarketingChannel[];
  stats: MarketingChannelStat[];
  summary: {
    monthlyBudgetTotal: number;
    budgetSource: 'strategy' | 'channels' | 'none';
    allocatedBudget: number;
    unallocatedBudget: number;
    allocatedSharePercent: number;
    activeChannels: number;
    visits: number;
    leads: number;
    orders: number;
    revenue: number;
    cost: number;
    roi: number;
    conversionRate: number;
    budgetUtilizationPercent: number | null;
  };
}

export interface MarketingMetricRow {
  id: string;
  channelId: string;
  date: string;
  visits: number;
  leads: number;
  orders: number;
  revenue: number;
  cost: number;
  createdAt: string;
  channel: { id: string; name: string; code: string };
}

export interface MarketingMetricsResponse {
  data: MarketingMetricRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CreateMarketingChannelDto = {
  name: string;
  code: string;
  priority?: number;
  monthlyBudget?: number | null;
  budgetSharePercent?: number | null;
  role?: string | null;
  description?: string | null;
  isActive?: boolean;
};

export type UpdateMarketingChannelDto = Partial<CreateMarketingChannelDto>;

export type UpdateMarketingStrategyDto = {
  title?: string;
  summary?: string | null;
  goals?: string | null;
  notes?: string | null;
  monthlyBudgetTotal?: number | null;
  monthlyBudgetNote?: string | null;
};

export type UpdateMarketingBudgetDto = {
  monthlyBudgetTotal?: number | null;
  monthlyBudgetNote?: string | null;
  channels?: Array<{
    id: string;
    monthlyBudget?: number | null;
    budgetSharePercent?: number | null;
  }>;
};

export type UpsertMarketingMetricDto = {
  channelId: string;
  date: string;
  visits?: number;
  leads?: number;
  orders?: number;
  revenue?: number;
  cost?: number;
};

export async function getMarketingOverview(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<MarketingOverview> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/marketing/overview${q ? `?${q}` : ''}`, {
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось загрузить обзор стратегии');
}

export async function updateMarketingStrategy(
  dto: UpdateMarketingStrategyDto
): Promise<MarketingStrategy> {
  const res = await apiFetch(`${API_URL}/admin/marketing/strategy`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseJson(res, 'Не удалось сохранить стратегию');
}

export async function updateMarketingBudget(
  dto: UpdateMarketingBudgetDto
): Promise<MarketingOverview> {
  const res = await apiFetch(`${API_URL}/admin/marketing/budget`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseJson(res, 'Не удалось сохранить бюджет');
}

export async function getMarketingStrategy(): Promise<MarketingStrategy> {
  const res = await apiFetch(`${API_URL}/admin/marketing/strategy`, {
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось загрузить стратегию');
}

export async function getMarketingChannels(): Promise<MarketingChannel[]> {
  const res = await apiFetch(`${API_URL}/admin/marketing/channels`, {
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось загрузить каналы');
}

export async function createMarketingChannel(
  dto: CreateMarketingChannelDto
): Promise<MarketingChannel> {
  const res = await apiFetch(`${API_URL}/admin/marketing/channels`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseJson(res, 'Не удалось создать канал');
}

export async function updateMarketingChannel(
  id: string,
  dto: UpdateMarketingChannelDto
): Promise<MarketingChannel> {
  const res = await apiFetch(`${API_URL}/admin/marketing/channels/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseJson(res, 'Не удалось обновить канал');
}

export async function deleteMarketingChannel(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/marketing/channels/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseJson(res, 'Не удалось удалить канал');
}

export async function getMarketingStats(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<MarketingChannelStat[]> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/marketing/stats${q ? `?${q}` : ''}`, {
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось загрузить статистику');
}

export async function getMarketingMetrics(params?: {
  channelId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<MarketingMetricsResponse> {
  const search = new URLSearchParams();
  if (params?.channelId) search.set('channelId', params.channelId);
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/marketing/metrics${q ? `?${q}` : ''}`, {
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось загрузить метрики');
}

export async function upsertMarketingMetric(
  dto: UpsertMarketingMetricDto
): Promise<MarketingMetricRow> {
  const res = await apiFetch(`${API_URL}/admin/marketing/metrics`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseJson(res, 'Не удалось сохранить метрику');
}

export async function deleteMarketingMetric(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/marketing/metrics/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseJson(res, 'Не удалось удалить метрику');
}
