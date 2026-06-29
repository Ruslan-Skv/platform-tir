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
}

export interface PublicOfferListItem {
  slug: string;
  title: string;
  name: string;
}
