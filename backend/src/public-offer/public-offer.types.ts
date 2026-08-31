export const PUBLIC_OFFER_SCOPE_TYPES = [
  'ALL_PRODUCTS',
  'ALL_SERVICES',
  'PRODUCT_CATEGORY',
  'SERVICE_CATEGORY',
] as const;

export type PublicOfferScopeType = (typeof PUBLIC_OFFER_SCOPE_TYPES)[number];

export type PublicOfferScopeInput = {
  scopeType: PublicOfferScopeType;
  scopeId?: string | null;
};

export interface PublicOfferData {
  id: string;
  slug: string;
  pageTitle: string;
  name: string;
  offerUrl: string | null;
  offerContent: string | null;
  acceptText: string;
  isPublished: boolean;
  isConfigured: boolean;
  isDefault: boolean;
  sortOrder: number;
  scopes: PublicOfferScopeInput[];
  /** Архивные редакции (без текущей). Новее — первыми. */
  versions?: PublicOfferVersionSummary[];
}

export interface PublicOfferVersionSummary {
  id: string;
  versionNumber: number;
  offerUrl: string | null;
  /** Есть ли сохранённый HTML/текст (без тела в списке). */
  hasContent: boolean;
  note: string | null;
  createdAt: string;
}

export interface PublicOfferVersionDetail extends PublicOfferVersionSummary {
  offerContent: string | null;
  pageTitle: string;
  name: string;
  slug: string;
}

export interface PublicOfferListItem {
  slug: string;
  title: string;
  name: string;
}
