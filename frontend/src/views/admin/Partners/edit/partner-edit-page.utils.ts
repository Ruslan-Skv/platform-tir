import { publicUploadUrl } from '@/shared/lib/public-upload-url';

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
  return publicUploadUrl(url);
}
