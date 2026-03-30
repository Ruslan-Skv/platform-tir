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
