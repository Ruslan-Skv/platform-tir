/**
 * Все запросы к нашему API с cookies (httpOnly refresh).
 * Не подменяет credentials, если в init уже задано явно.
 */
import { fetchWithTimeout } from './fetch-with-timeout';

const RETRY_HEADER = 'x-auth-retry';

/** За сколько до exp обновлять access до первого fetch (избегает лишних 401 в консоли). */
const PROACTIVE_REFRESH_SKEW_MS = 120_000;

type HeaderValue = string | null;

function normalizeHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const h = new Headers();
  if (input instanceof Request) {
    input.headers.forEach((v, k) => h.set(k, v));
  }
  if (init?.headers) {
    new Headers(init.headers).forEach((v, k) => h.set(k, v));
  }
  return h;
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Эндпоинты, для которых нельзя вызывать silent refresh до запроса (иначе deadlock с refreshInFlight). */
function isAuthBootstrapRequest(input: RequestInfo | URL): boolean {
  const url = resolveRequestUrl(input);
  return /\/auth\/(login|refresh|logout|register)(?:\?|$|\/)/.test(url);
}

/** Access только в памяти — перед запросом восстанавливаем из refresh-cookie, если есть профиль в storage. */
async function attachSessionBearerIfNeeded(
  headers: Headers,
  input: RequestInfo | URL
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isAuthBootstrapRequest(input)) return;
  if (headers.get('authorization')) return;

  try {
    const { restoreAccessTokenFromSession, canAttemptSilentRefresh } =
      await import('./auth-session');
    if (!canAttemptSilentRefresh()) return;
    const token = await restoreAccessTokenFromSession();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
  } catch {
    /* запрос пойдёт без Bearer — ниже сработает refresh по 401 */
  }
}

/** Если в заголовках уже Bearer и JWT скоро истечёт — тихо обновить access до запроса. */
async function proactiveRefreshBearerIfStale(headers: Headers): Promise<void> {
  if (typeof window === 'undefined') return;
  const raw = headers.get('authorization');
  if (!raw?.toLowerCase().startsWith('bearer ')) return;
  const token = raw.slice(7).trim();
  if (!token) return;
  try {
    const { getJwtExpMs, ensureFreshAccessToken, getStoredAccessToken } =
      await import('./auth-session');
    const exp = getJwtExpMs(token);
    if (exp && exp - Date.now() > PROACTIVE_REFRESH_SKEW_MS) return;
    await ensureFreshAccessToken(PROACTIVE_REFRESH_SKEW_MS);
    const next = getStoredAccessToken();
    if (next) headers.set('authorization', `Bearer ${next}`);
  } catch {
    /* оставляем исходный Bearer — сработает ретрай по 401 */
  }
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const mod = await import('./auth-session');
    return mod.refreshAccessTokenSilently();
  } catch {
    return false;
  }
}

function latestAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const mod = require('./auth-session') as typeof import('./auth-session');
    return mod.getStoredAccessToken();
  } catch {
    return null;
  }
}

function hasPersistedAuthSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const mod = require('./auth-session') as typeof import('./auth-session');
    return mod.hasPersistedAuthSession();
  } catch {
    return Boolean(localStorage.getItem('admin_user') || localStorage.getItem('user_data'));
  }
}

function canRetry401(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  headers: Headers
): boolean {
  if (typeof window === 'undefined') return false;
  if (headers.get(RETRY_HEADER) === '1') return false;
  try {
    const mod = require('./auth-session') as typeof import('./auth-session');
    if (!mod.canAttemptSilentRefresh()) return false;
  } catch {
    if (!hasPersistedAuthSessionHint()) return false;
  }
  if (!headers.get('authorization') && !hasPersistedAuthSessionHint()) return false;
  // Повтор небезопасен для не-GET с телом из Request (stream уже прочитан).
  if (input instanceof Request) {
    const method = (init?.method ?? input.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && input.body != null) return false;
  }
  return true;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const baseHeaders = normalizeHeaders(input, init);
  await attachSessionBearerIfNeeded(baseHeaders, input);
  await proactiveRefreshBearerIfStale(baseHeaders);
  const response = await fetchWithTimeout(input, {
    ...init,
    headers: baseHeaders,
    credentials: init?.credentials ?? 'include',
  });

  if (response.status !== 401 || !canRetry401(input, init, baseHeaders)) {
    return response;
  }

  const refreshed = await tryRefreshAccessToken();
  if (!refreshed) return response;

  const retryHeaders = new Headers(baseHeaders);
  retryHeaders.set(RETRY_HEADER, '1');
  const nextToken: HeaderValue = latestAccessTokenFromStorage();
  if (nextToken) {
    retryHeaders.set('authorization', `Bearer ${nextToken}`);
  }

  return fetchWithTimeout(input, {
    ...init,
    headers: retryHeaders,
    credentials: init?.credentials ?? 'include',
  });
}
