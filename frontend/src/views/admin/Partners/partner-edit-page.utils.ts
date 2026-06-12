import { UPLOADS_BASE } from './partner-edit-page.constants';

export function parsePartnerPhones(phone: unknown): string[] {
  if (Array.isArray(phone)) {
    return phone.filter((p): p is string => typeof p === 'string' && Boolean(p.trim()));
  }
  if (typeof phone === 'string' && phone.trim()) {
    return [phone];
  }
  return [];
}

export function logoPreviewUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}
