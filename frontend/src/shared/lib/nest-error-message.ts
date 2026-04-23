/** NestJS: поле `message` может быть строкой или массивом (class-validator). */
export function nestMessageFromBody(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const msg = (body as { message?: unknown }).message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg) && msg.every((x) => typeof x === 'string')) return msg.join(', ');
  return '';
}

const PROXY_OR_SERVER_500_HINT =
  'Ошибка сервера или прокси (HTTP 500). Убедитесь, что бэкенд запущен и доступен по адресу из next.config (по умолчанию http://localhost:3001). В терминале Next часто видно: Failed to proxy … — значит API не отвечает. Если бэкенд работает, смотрите его лог: JWT_SECRET, миграции (user_refresh_tokens), формат JWT_*_EXPIRES_IN.';

/** Сообщение для пользователя после неуспешного login/register (и похожих POST). */
export function formatAuthHttpError(
  response: Response,
  body: unknown,
  opts: { unauthorizedFallback: string; defaultFallback: string }
): string {
  const raw = nestMessageFromBody(body);
  if (response.status === 401) {
    return raw === 'Unauthorized' || !raw ? opts.unauthorizedFallback : raw;
  }
  if (response.status >= 500) {
    return raw || PROXY_OR_SERVER_500_HINT;
  }
  return raw || opts.defaultFallback;
}
