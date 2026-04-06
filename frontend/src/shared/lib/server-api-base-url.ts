/**
 * Базовый URL API для серверных запросов Next.js (SSR, generateMetadata, layout).
 *
 * В Docker на проде в контейнере frontend нужно задать API_INTERNAL_URL=http://backend:3001
 * (без хвоста /api/v1) — иначе SSR не достучится до API по localhost или внешнему URL изнутри сети Docker.
 *
 * NEXT_PUBLIC_API_URL по-прежнему для браузера; при отсутствии internal используется как запасной вариант на сервере.
 */
export function getServerApiBaseUrl(): string {
  const internal = process.env.API_INTERNAL_URL?.trim();
  if (internal) {
    const base = internal.replace(/\/$/, '');
    return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  }
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (pub) {
    const base = pub.replace(/\/$/, '');
    return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  }
  return 'http://localhost:3001/api/v1';
}
