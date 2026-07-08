import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Публичные опции формы «Рассчитать стоимость» (виды работ/товаров) */
export async function getQuoteFormOptions(): Promise<{ options: string[] }> {
  const res = await apiFetch(`${API_URL}/forms/quote-form-options`);
  if (!res.ok) throw new Error('Не удалось загрузить опции формы');
  return res.json();
}

export interface MeasurementFormPayload {
  name: string;
  phone: string;
  email?: string;
  address: string;
  preferredDate: string;
  preferredTime?: string;
  productType?: string;
  comments?: string;
  consentAccepted: boolean;
}

export interface CallbackFormPayload {
  name: string;
  phone: string;
  email?: string;
  preferredTime: string;
  comment?: string;
  consentAccepted: boolean;
}

export interface DirectorMessageFormPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  consentAccepted: boolean;
}

export interface QuoteFormPayload {
  name: string;
  phone: string;
  email?: string;
  /** Вид работ: строка (выбранные позиции + свой вариант через запятую) */
  serviceType: string;
  address?: string;
  comment?: string;
  consentAccepted: boolean;
}

export async function submitMeasurementForm(data: MeasurementFormPayload): Promise<void> {
  const res = await apiFetch(`${API_URL}/forms/measurement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.message ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось отправить заявку';
    throw new Error(message);
  }
}

export async function submitCallbackForm(data: CallbackFormPayload): Promise<void> {
  const res = await apiFetch(`${API_URL}/forms/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.message ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось отправить заявку';
    throw new Error(message);
  }
}

export async function submitDirectorMessageForm(data: DirectorMessageFormPayload): Promise<void> {
  const res = await apiFetch(`${API_URL}/forms/director-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.message ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось отправить письмо';
    throw new Error(message);
  }
}

export async function submitQuoteForm(data: QuoteFormPayload): Promise<void> {
  const res = await apiFetch(`${API_URL}/forms/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.message ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось отправить заявку';
    throw new Error(message);
  }
}
