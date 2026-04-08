/**
 * true, если fetch не дошёл до ответа сервера (часто «Failed to fetch» / CORS / неверный URL).
 * Это не HTTP 403 от Nest — на 403 fetch обычно возвращает res с телом JSON.
 */
export function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('load failed') ||
    m.includes('networkerror') ||
    m.includes('network request failed')
  );
}

/**
 * Извлекает текст ошибки из тела ответа NestJS (message: string | string[]).
 */
export function getApiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }
  const msg = (data as { message?: unknown }).message;
  if (typeof msg === 'string' && msg.trim()) {
    return msg.trim();
  }
  if (Array.isArray(msg)) {
    const parts = msg.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }
  return fallback;
}
