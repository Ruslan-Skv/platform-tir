import { apiFetch } from '@/shared/lib/api-fetch';

function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return '/api/v1';
  return 'http://localhost:3001/api/v1';
}

/** База URL API для fetch (в браузере по умолчанию /api/v1 через Next rewrite). */
export function getApiBaseUrl(): string {
  return apiBase();
}

const ADMIN_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'PARTNER',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
]);

export type TokenLoginPayload = {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
};

let refreshInFlight: Promise<boolean> | null = null;

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return atob(padded + '='.repeat(padLen));
}

/** exp из JWT (без проверки подписи — только для планирования silent refresh). */
export function getJwtExpMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: number };
    if (typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/** Сохранить access и user в localStorage (refresh только в httpOnly cookie у API origin). */
export function persistTokenResponse(data: TokenLoginPayload): void {
  if (typeof window === 'undefined') return;
  const isAdmin = ADMIN_ROLES.has(data.user.role);
  localStorage.setItem('user_token', data.access_token);
  localStorage.setItem('user_data', JSON.stringify(data.user));
  if (isAdmin) {
    localStorage.setItem('admin_token', data.access_token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
  } else {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }
  window.dispatchEvent(new Event('auth-token-changed'));
}

export async function refreshAccessTokenSilently(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await apiFetch(`${apiBase()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) return false;
      const data = (await res.json()) as TokenLoginPayload;
      if (!data.access_token || !data.user) return false;
      persistTokenResponse(data);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Актуализирует access заранее, чтобы фоновые поллеры не ловили 401 в момент экспирации. */
export async function ensureFreshAccessToken(minTtlMs = 60_000): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const current = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  if (!current) return false;
  const expMs = getJwtExpMs(current);
  if (!expMs) return true;
  if (expMs - Date.now() > minTtlMs) return true;
  return refreshAccessTokenSilently();
}

export async function revokeRefreshOnServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await apiFetch(`${apiBase()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch {
    // игнорируем сеть при выходе
  }
}
