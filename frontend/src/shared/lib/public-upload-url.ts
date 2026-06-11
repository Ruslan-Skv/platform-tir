/**
 * Публичный URL для файлов из backend `/uploads/...` (бэйджи карточки, логотипы и т.д.).
 *
 * Для путей `/uploads/...` возвращаем относительный URL: в браузере запрос идёт на тот же хост,
 * что и сайт — в Docker за nginx это проксируется на backend (`location /uploads/`).
 * Так картинки работают даже если `NEXT_PUBLIC_API_URL` при сборке указывает на внутренний хост
 * (`http://backend:3001`), который с браузера недоступен.
 *
 * В dev Next проксирует `/uploads` на `API_INTERNAL_URL` / localhost:3001 (см. next.config.js rewrites).
 */

/**
 * Раньше при API_BASE_URL с суффиксом /api/v1 в БД попадали URL вида .../api/v1/uploads/...
 * Статика отдаётся с `/uploads/`, не под префиксом API — убираем лишний сегмент.
 */
export function normalizeUploadsInUrl(url: string): string {
  if (!url) return url;
  return url
    .replace(/^(https?:\/\/[^/?#]+)\/api\/v1(?=\/uploads\/)/i, '$1')
    .replace(/^\/api\/v1(?=\/uploads\/)/, '')
    .replace(/^https?:\/\/[^/?#]+(?=\/uploads\/)/i, '');
}

export function publicUploadUrl(path: string | null | undefined): string {
  if (path == null || path === '') return '';
  const p = normalizeUploadsInUrl(path.trim());
  if (/^https?:\/\//i.test(p)) return p;
  const normalized = p.startsWith('/') ? p : `/${p}`;
  if (normalized.startsWith('/uploads/')) {
    return normalized;
  }
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const base = api.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
  return `${base}${normalized}`;
}
