import { apiFetch } from '@/shared/lib/api-fetch';

const API_FALLBACK = 'http://localhost:3001/api/v1';

function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (!raw) return API_FALLBACK;
  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${raw.replace(/\/$/, '')}`;
    }
    return API_FALLBACK;
  }
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw.replace(/\/$/, '')}`;
  }
  return raw.replace(/\/$/, '');
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type ContractDocumentSigningSessionStatus =
  | 'PENDING'
  | 'VIEWED'
  | 'SIGNED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type SigningSessionDocument = {
  tabId: string;
  label: string;
  fileUrl: string;
  fileName: string;
};

export type ContractDocumentSigningSessionCreated = {
  id: string;
  token: string;
  signUrl: string;
  otpCode: string;
  status: ContractDocumentSigningSessionStatus;
  expiresAt: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
  documents: SigningSessionDocument[];
  emailSent: boolean;
};

export type ContractDocumentSigningSessionListItem = {
  id: string;
  status: ContractDocumentSigningSessionStatus;
  signUrl: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  documents: SigningSessionDocument[];
  managerNote: string | null;
  expiresAt: string;
  viewedAt: string | null;
  signedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  signedName: string | null;
  createdAt: string;
};

export type PublicSigningSession = {
  status: ContractDocumentSigningSessionStatus;
  customerName: string | null;
  contractTitle: string | null;
  packageKind: string;
  managerNote: string | null;
  expiresAt: string;
  viewedAt: string | null;
  signedAt: string | null;
  rejectedAt: string | null;
  signedName: string | null;
  documents: SigningSessionDocument[];
  canSign: boolean;
};

export async function createPackageSigningSession(
  packageId: string,
  input: {
    documents: Array<{
      tabId: string;
      label: string;
      file: Blob;
      fileName: string;
      isExternalFile?: boolean;
    }>;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    managerNote?: string;
    expiresInDays?: number;
    sendEmail?: boolean;
  }
): Promise<ContractDocumentSigningSessionCreated> {
  const form = new FormData();
  form.append(
    'documentsMeta',
    JSON.stringify(
      input.documents.map((d) => ({
        tabId: d.tabId,
        label: d.label,
        ...(d.isExternalFile ? { isExternalFile: true } : {}),
      }))
    )
  );
  for (const doc of input.documents) {
    form.append('files', doc.file, doc.fileName);
  }
  if (input.customerName) form.append('customerName', input.customerName);
  if (input.customerPhone) form.append('customerPhone', input.customerPhone);
  if (input.customerEmail) form.append('customerEmail', input.customerEmail);
  if (input.managerNote) form.append('managerNote', input.managerNote);
  if (input.expiresInDays != null) form.append('expiresInDays', String(input.expiresInDays));
  if (input.sendEmail) form.append('sendEmail', 'true');

  const res = await fetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/signing-sessions`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: form,
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = 'Не удалось создать ссылку на подписание';
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      if (typeof json.message === 'string') message = json.message;
      else if (Array.isArray(json.message)) message = json.message.join(', ');
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }
  return (await res.json()) as ContractDocumentSigningSessionCreated;
}

export async function listPackageSigningSessions(
  packageId: string
): Promise<ContractDocumentSigningSessionListItem[]> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/signing-sessions`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(parseApiErrorMessage(text, 'Не удалось загрузить сессии подписания'));
  }
  return (await res.json()) as ContractDocumentSigningSessionListItem[];
}

export async function cancelPackageSigningSession(
  packageId: string,
  sessionId: string
): Promise<ContractDocumentSigningSessionListItem> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/signing-sessions/${sessionId}/cancel`,
    { method: 'POST', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(parseApiErrorMessage(text, 'Не удалось отозвать ссылку'));
  }
  return (await res.json()) as ContractDocumentSigningSessionListItem;
}

function parseApiErrorMessage(text: string, fallback: string): string {
  try {
    const json = JSON.parse(text) as { message?: string | string[] };
    if (typeof json.message === 'string') return json.message;
    if (Array.isArray(json.message)) return json.message.join(', ');
  } catch {
    if (text) return text.slice(0, 200);
  }
  return fallback;
}

export async function getPublicSigningSession(token: string): Promise<PublicSigningSession> {
  const res = await fetch(
    `${getApiBaseUrl()}/contract-document-signing/${encodeURIComponent(token)}`
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(parseApiErrorMessage(text, 'Ссылка недействительна'));
  }
  return (await res.json()) as PublicSigningSession;
}

export async function markPublicSigningViewed(token: string): Promise<PublicSigningSession> {
  const res = await fetch(
    `${getApiBaseUrl()}/contract-document-signing/${encodeURIComponent(token)}/view`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('Не удалось отметить просмотр');
  return (await res.json()) as PublicSigningSession;
}

export async function signPublicSigningSession(
  token: string,
  body: { otpCode: string; signedName: string; consent: boolean }
): Promise<PublicSigningSession> {
  const res = await fetch(
    `${getApiBaseUrl()}/contract-document-signing/${encodeURIComponent(token)}/sign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = 'Не удалось подписать';
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      if (typeof json.message === 'string') message = json.message;
      else if (Array.isArray(json.message)) message = json.message.join(', ');
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }
  return (await res.json()) as PublicSigningSession;
}

export async function rejectPublicSigningSession(
  token: string,
  reason?: string
): Promise<PublicSigningSession> {
  const res = await fetch(
    `${getApiBaseUrl()}/contract-document-signing/${encodeURIComponent(token)}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Не удалось отклонить');
  }
  return (await res.json()) as PublicSigningSession;
}

export function remoteSigningStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'PENDING':
      return 'На согласовании';
    case 'VIEWED':
      return 'Просмотрено заказчиком';
    case 'SIGNED':
      return 'Подписано дистанционно';
    case 'REJECTED':
      return 'Отклонено заказчиком';
    case 'EXPIRED':
      return 'Ссылка истекла';
    case 'CANCELLED':
      return 'Отозвано';
    default:
      return '';
  }
}
