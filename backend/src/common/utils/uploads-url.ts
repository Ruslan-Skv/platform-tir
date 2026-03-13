/**
 * Базовый URL для раздачи загрузок (uploads).
 * Nginx отдаёт /uploads/ в корне сайта, а не под /api/v1.
 * Если API_BASE_URL = https://example.com/api/v1, убираем /api/v1.
 */
export function uploadsBaseUrl(baseUrl?: string): string {
  if (!baseUrl) return '';
  return baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}
