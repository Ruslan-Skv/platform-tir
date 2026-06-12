const UPLOADS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(
  /\/api\/v1\/?$/,
  ''
);

export function getPromotionImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
}
