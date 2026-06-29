export interface SiteDisclaimerInfo {
  content: string;
  isPublished: boolean;
  isConfigured: boolean;
}

export function isSiteDisclaimerActive(data: SiteDisclaimerInfo | null | undefined): boolean {
  return Boolean(data?.isPublished && data.isConfigured);
}
