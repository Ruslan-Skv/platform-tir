const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface MeasurementFormPayload {
  name: string;
  phone: string;
  email: string;
  address: string;
  preferredDate: string;
  preferredTime: string;
  productType: string;
  comments?: string;
}

export interface CallbackFormPayload {
  name: string;
  phone: string;
  email?: string;
  preferredTime: string;
  comment?: string;
}

export async function submitMeasurementForm(data: MeasurementFormPayload): Promise<void> {
  const res = await fetch(`${API_URL}/forms/measurement`, {
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
  const res = await fetch(`${API_URL}/forms/callback`, {
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
