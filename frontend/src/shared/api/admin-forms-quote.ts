import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface QuoteFormSettings {
  recipientEmail: string | null;
  telegramChatId: string | null;
  serviceTypeOptions: string[];
  updatedAt: string | null;
}

export async function getAdminQuoteFormSettings(
  getAuthHeaders: () => Record<string, string>
): Promise<QuoteFormSettings> {
  const res = await apiFetch(`${API_URL}/admin/forms/quote-form-settings`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminQuoteFormSettings(
  data: {
    recipientEmail?: string | null;
    telegramChatId?: string | null;
    serviceTypeOptions?: string[] | null;
  },
  getAuthHeaders: () => Record<string, string>
): Promise<QuoteFormSettings> {
  const res = await apiFetch(`${API_URL}/admin/forms/quote-form-settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Не удалось сохранить настройки');
  }
  return res.json();
}
