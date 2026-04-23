const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

export const USER_REFRESH_KEY = 'user_refresh_token';
export const ADMIN_REFRESH_KEY = 'admin_refresh_token';

export type TokenLoginPayload = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
};

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

/** Сохранить пару access+refresh и user_* / admin_* как при входе. */
export function persistTokenResponse(data: TokenLoginPayload): void {
  if (typeof window === 'undefined') return;
  const isAdmin = ADMIN_ROLES.has(data.user.role);
  localStorage.setItem('user_token', data.access_token);
  localStorage.setItem('user_data', JSON.stringify(data.user));
  localStorage.setItem(USER_REFRESH_KEY, data.refresh_token);
  if (isAdmin) {
    localStorage.setItem('admin_token', data.access_token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    localStorage.setItem(ADMIN_REFRESH_KEY, data.refresh_token);
  } else {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem(ADMIN_REFRESH_KEY);
  }
  window.dispatchEvent(new Event('auth-token-changed'));
}

export async function refreshAccessTokenSilently(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refresh = localStorage.getItem(USER_REFRESH_KEY) || localStorage.getItem(ADMIN_REFRESH_KEY);
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TokenLoginPayload;
    if (!data.access_token || !data.refresh_token || !data.user) return false;
    persistTokenResponse(data);
    return true;
  } catch {
    return false;
  }
}

export async function revokeRefreshOnServer(refreshToken: string | null): Promise<void> {
  if (!refreshToken || typeof window === 'undefined') return;
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // игнорируем сеть при выходе
  }
}
