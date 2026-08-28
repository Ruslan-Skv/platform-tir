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

export type CalendarEventType =
  | 'installation'
  | 'waybill'
  | 'measurement'
  | 'contract'
  | 'delivery'
  | 'contract_install'
  | 'work_day'
  | 'custom';

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  date: string;
  timeFrom: string | null;
  timeTo: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  href: string;
  body?: string | null;
};

export type CalendarEventsResponse = {
  from: string;
  to: string;
  events: CalendarEvent[];
};

export async function listCalendarEvents(params: {
  from: string;
  to: string;
  types?: CalendarEventType[];
}): Promise<CalendarEventsResponse> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  if (params.types?.length) qs.set('types', params.types.join(','));
  const res = await apiFetch(`${API_URL}/admin/calendar/events?${qs}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return parseJson(res, 'Не удалось загрузить календарь');
}

export async function createCalendarCustomEvent(payload: {
  title: string;
  body?: string | null;
  date: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  notifyUserIds?: string[];
}): Promise<CalendarEvent> {
  const res = await apiFetch(`${API_URL}/admin/calendar/events`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось создать событие');
}
