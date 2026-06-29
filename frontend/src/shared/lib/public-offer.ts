export const SITE_PUBLIC_OFFERS_PATH = '/offer';

export function publicOfferPath(slug: string): string {
  return `/offer/${slug}`;
}

export type PublicOfferScopeType =
  | 'ALL_PRODUCTS'
  | 'ALL_SERVICES'
  | 'PRODUCT_CATEGORY'
  | 'SERVICE_CATEGORY';

export interface PublicOfferScopeInfo {
  scopeType: PublicOfferScopeType;
  scopeId: string | null;
}

export interface PublicOfferInfo {
  id: string;
  slug: string;
  pageTitle: string;
  name: string;
  offerUrl: string | null;
  offerContent: string | null;
  acceptText: string;
  isPublished: boolean;
  isConfigured: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  scopes?: PublicOfferScopeInfo[];
}

export interface PublicOfferListItem {
  slug: string;
  title: string;
  name: string;
}

export function isPublicOfferActive(data: PublicOfferInfo | null | undefined): boolean {
  return Boolean(data?.isPublished && data.isConfigured);
}

export function areAllOffersAccepted(offers: PublicOfferInfo[], acceptedIds: Set<string>): boolean {
  return offers.length > 0 && offers.every((offer) => acceptedIds.has(offer.id));
}

export function isPublicOfferPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = url.split('?')[0]?.toLowerCase() ?? '';
  return normalized.endsWith('.pdf') || normalized.includes('/uploads/offer/');
}

export function resolvePublicOfferEmbedUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const { pathname } = new URL(trimmed);
      if (pathname.startsWith('/uploads/')) return pathname;
    } catch {
      /* ignore */
    }
    return trimmed;
  }
  return trimmed;
}

export function formatPublicOfferContent(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n');
}

/** @deprecated Используйте SITE_PUBLIC_OFFERS_PATH */
export const SITE_PUBLIC_OFFER_PATH = SITE_PUBLIC_OFFERS_PATH;
