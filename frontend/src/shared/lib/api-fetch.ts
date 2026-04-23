/**
 * Все запросы к нашему API с cookies (httpOnly refresh).
 * Не подменяет credentials, если в init уже задано явно.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
  });
}
