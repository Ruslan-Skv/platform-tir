export const SITE_SELLER_LEGAL_PATH = '/legal';

export type SellerLegalEntityType = 'IP' | 'UL';

export interface SellerLegalInfo {
  pageTitle: string;
  legalName: string;
  entityType: SellerLegalEntityType;
  inn: string;
  ogrn: string;
  ogrnLabel: string;
  legalAddress: string;
  phone: string;
  email: string;
  isPublished: boolean;
  isConfigured: boolean;
}

export function isSellerLegalConfigured(data: SellerLegalInfo | null | undefined): boolean {
  return Boolean(data?.isConfigured && data.isPublished);
}

export function formatSellerLegalCompactLine(data: SellerLegalInfo): string {
  const parts = [data.legalName];
  if (data.ogrn) {
    parts.push(`${data.ogrnLabel} ${data.ogrn}`);
  }
  return parts.filter(Boolean).join(' · ');
}
