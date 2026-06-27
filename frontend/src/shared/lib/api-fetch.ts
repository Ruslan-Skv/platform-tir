/**
 * Все запросы к нашему API с cookies (httpOnly refresh).
 * Не подменяет credentials, если в init уже задано явно.
 */
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

function canRetry401(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  headers: Headers
): boolean {
  if (typeof window === 'undefined') return false;
  if (headers.get(RETRY_HEADER) === '1') return false;
  if (!headers.get('authorization')) return false;
  // Повтор небезопасен для не-GET с телом из Request (stream уже прочитан).
  if (input instanceof Request) {
    const method = (init?.method ?? input.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && input.body != null) return false;
  }
  return true;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const baseHeaders = normalizeHeaders(input, init);
  await proactiveRefreshBearerIfStale(baseHeaders);
  const response = await fetch(input, {
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

  return fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: init?.credentials ?? 'include',
  });
}
