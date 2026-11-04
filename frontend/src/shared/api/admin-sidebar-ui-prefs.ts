import { apiFetch } from '@/shared/lib/api-fetch';
import {
  ensureFreshAccessToken,
  getApiBaseUrl,
  getStoredAccessToken,
} from '@/shared/lib/auth-session';

export type AdminSidebarUiPrefsDto = {
  hideIcons: boolean;
  mobileLayout: 'list' | 'grid3';
  desktopLayout: 'list' | 'grid2';
  navOrder: string[];
  logoVariant: 'classic' | 'mission';
};

/** Допустимый размер сохраняемого порядка разделов (защита от битых данных). */
const MAX_NAV_ORDER_ITEMS = 200;

export function normalizeNavOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((href): href is string => typeof href === 'string' && href.length > 0)
    .slice(0, MAX_NAV_ORDER_ITEMS);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function normalizePrefs(data: Partial<AdminSidebarUiPrefsDto>): AdminSidebarUiPrefsDto {
  return {
    hideIcons: Boolean(data.hideIcons),
    mobileLayout: data.mobileLayout === 'grid3' ? 'grid3' : 'list',
    desktopLayout: data.desktopLayout === 'grid2' ? 'grid2' : 'list',
    navOrder: normalizeNavOrder(data.navOrder),
    logoVariant: data.logoVariant === 'mission' ? 'mission' : 'classic',
  };
}

export async function getAdminSidebarUiPrefs(): Promise<AdminSidebarUiPrefsDto> {
  await ensureFreshAccessToken(0);
  const res = await apiFetch(`${getApiBaseUrl()}/users/me/admin-sidebar-ui-prefs`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки вида меню');
  return normalizePrefs((await res.json()) as Partial<AdminSidebarUiPrefsDto>);
}

export async function updateAdminSidebarUiPrefs(
  patch: Partial<AdminSidebarUiPrefsDto>
): Promise<AdminSidebarUiPrefsDto> {
  await ensureFreshAccessToken(0);
  const res = await apiFetch(`${getApiBaseUrl()}/users/me/admin-sidebar-ui-prefs`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      (typeof err?.message === 'string' && err.message) ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось сохранить настройки вида меню';
    throw new Error(message);
  }
  return normalizePrefs((await res.json()) as Partial<AdminSidebarUiPrefsDto>);
}
