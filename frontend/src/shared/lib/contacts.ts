export interface ContactsPageInfo {
  pageTitle: string;
  introText: string | null;
  isPublished: boolean;
}

export interface ContactSalonManagerInfo {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  sortOrder: number;
}

export interface ContactSalonInfo {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  managers: ContactSalonManagerInfo[];
}

export interface PublicContactsData {
  page: ContactsPageInfo | null;
  salons: ContactSalonInfo[];
}

export type ContactSalonManagerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  sortOrder?: number;
};

export type ContactSalonInput = {
  name: string;
  address: string;
  phone?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  managers?: ContactSalonManagerInput[];
};

const UPLOADS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(
  /\/api\/v1\/?$/,
  ''
);

export function getContactImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
}

export function formatContactPhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return `tel:+${digits.startsWith('8') ? '7' + digits.slice(1) : digits}`;
  }
  return `tel:${phone}`;
}
