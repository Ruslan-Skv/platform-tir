/**
 * Все запросы к нашему API с cookies (httpOnly refresh).
 * Не подменяет credentials, если в init уже задано явно.
 */
const RETRY_HEADER = 'x-auth-retry';

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
  return localStorage.getItem('user_token') || localStorage.getItem('admin_token');
}

function canRetry401(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  headers: Headers
): boolean {
  if (typeof window === 'undefined') return false;
  if (headers.get(RETRY_HEADER) === '1') return false;
  if (!headers.get('authorization')) return false;
  // Если передан Request со stream-body, повтор может быть небезопасен.
  if (input instanceof Request && init?.body === undefined) return false;
  return true;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const baseHeaders = normalizeHeaders(input, init);
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
