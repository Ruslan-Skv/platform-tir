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

const REFRESH_FAIL_KEY = 'auth_refresh_failed_at';
/** После 401 на refresh не долбим API, пока пользователь снова не войдёт. */
const REFRESH_FAIL_COOLDOWN_MS = 10 * 60_000;

function markRefreshFailed(): void {
  sessionStorage.setItem(REFRESH_FAIL_KEY, String(Date.now()));
}

function clearRefreshCooldown(): void {
  sessionStorage.removeItem(REFRESH_FAIL_KEY);
}

function isRefreshInCooldown(): boolean {
  const raw = sessionStorage.getItem(REFRESH_FAIL_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  if (Date.now() - at > REFRESH_FAIL_COOLDOWN_MS) {
    clearRefreshCooldown();
    return false;
  }
  return true;
}

/** Сброс access в localStorage (refresh только в httpOnly cookie). */
export function clearStoredAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.dispatchEvent(new Event('auth-token-changed'));
}

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
  clearRefreshCooldown();
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
  if (isRefreshInCooldown()) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await apiFetch(`${apiBase()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          markRefreshFailed();
          clearStoredAuthSession();
        }
        return false;
      }
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
  if (isRefreshInCooldown()) return false;
  const current = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  if (!current) return false;
  const expMs = getJwtExpMs(current);
  if (!expMs) return true;
  if (expMs - Date.now() > minTtlMs) return true;
  return refreshAccessTokenSilently();
}

/** Токен из localStorage (user или admin). */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_token') || localStorage.getItem('admin_token');
}

/** Есть bearer и он не истёк (с запасом minTtlMs). */
export function hasUsableStoredAccessToken(minTtlMs = 0): boolean {
  const token = getStoredAccessToken();
  if (!token) return false;
  const expMs = getJwtExpMs(token);
  if (!expMs) return true;
  return expMs - Date.now() > minTtlMs;
}

/**
 * В фоновой вкладке setInterval почти не работает — при возврате обновляем access до поллеров.
 * @returns cleanup
 */
export function bindAuthRefreshOnPageVisible(minTtlMs = 120_000): () => void {
  if (typeof window === 'undefined') return () => {};

  const refreshIfVisible = () => {
    if (document.visibilityState !== 'visible') return;
    void ensureFreshAccessToken(minTtlMs);
  };

  document.addEventListener('visibilitychange', refreshIfVisible);
  window.addEventListener('focus', refreshIfVisible);
  return () => {
    document.removeEventListener('visibilitychange', refreshIfVisible);
    window.removeEventListener('focus', refreshIfVisible);
  };
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
