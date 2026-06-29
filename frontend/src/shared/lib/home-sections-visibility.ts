export interface HomeSectionsVisibility {
  heroVisible: boolean;
  heroMobileVisible: boolean;
  directionsVisible: boolean;
  directionsMobileVisible: boolean;
  advantagesVisible: boolean;
  advantagesMobileVisible: boolean;
  servicesVisible: boolean;
  servicesMobileVisible: boolean;
  featuredProductsVisible: boolean;
  featuredProductsMobileVisible: boolean;
  contactFormVisible: boolean;
  contactFormMobileVisible: boolean;
}

export type HomeSectionDesktopKey =
  | 'heroVisible'
  | 'directionsVisible'
  | 'advantagesVisible'
  | 'servicesVisible'
  | 'featuredProductsVisible'
  | 'contactFormVisible';

export type HomeSectionMobileKey =
  | 'heroMobileVisible'
  | 'directionsMobileVisible'
  | 'advantagesMobileVisible'
  | 'servicesMobileVisible'
  | 'featuredProductsMobileVisible'
  | 'contactFormMobileVisible';

export interface HomeSectionVisibilityPair {
  desktopKey: HomeSectionDesktopKey;
  mobileKey: HomeSectionMobileKey;
}

export const HOME_SECTION_VISIBILITY_PAIRS: HomeSectionVisibilityPair[] = [
  { desktopKey: 'heroVisible', mobileKey: 'heroMobileVisible' },
  { desktopKey: 'directionsVisible', mobileKey: 'directionsMobileVisible' },
  { desktopKey: 'advantagesVisible', mobileKey: 'advantagesMobileVisible' },
  { desktopKey: 'servicesVisible', mobileKey: 'servicesMobileVisible' },
  { desktopKey: 'featuredProductsVisible', mobileKey: 'featuredProductsMobileVisible' },
  { desktopKey: 'contactFormVisible', mobileKey: 'contactFormMobileVisible' },
];

export const DEFAULT_HOME_SECTIONS_VISIBILITY: HomeSectionsVisibility = {
  heroVisible: true,
  heroMobileVisible: true,
  directionsVisible: true,
  directionsMobileVisible: true,
  advantagesVisible: true,
  advantagesMobileVisible: true,
  servicesVisible: true,
  servicesMobileVisible: true,
  featuredProductsVisible: true,
  featuredProductsMobileVisible: true,
  contactFormVisible: true,
  contactFormMobileVisible: true,
};

export function normalizeHomeSectionsVisibility(
  data: Partial<HomeSectionsVisibility> | null | undefined
): HomeSectionsVisibility {
  if (!data) return DEFAULT_HOME_SECTIONS_VISIBILITY;

  return {
    heroVisible: data.heroVisible ?? true,
    heroMobileVisible: data.heroMobileVisible ?? data.heroVisible ?? true,
    directionsVisible: data.directionsVisible ?? true,
    directionsMobileVisible: data.directionsMobileVisible ?? data.directionsVisible ?? true,
    advantagesVisible: data.advantagesVisible ?? true,
    advantagesMobileVisible: data.advantagesMobileVisible ?? data.advantagesVisible ?? true,
    servicesVisible: data.servicesVisible ?? true,
    servicesMobileVisible: data.servicesMobileVisible ?? data.servicesVisible ?? true,
    featuredProductsVisible: data.featuredProductsVisible ?? true,
    featuredProductsMobileVisible:
      data.featuredProductsMobileVisible ?? data.featuredProductsVisible ?? true,
    contactFormVisible: data.contactFormVisible ?? true,
    contactFormMobileVisible: data.contactFormMobileVisible ?? data.contactFormVisible ?? true,
  };
}

export function isHomeSectionRendered(
  visibility: HomeSectionsVisibility,
  desktopKey: HomeSectionDesktopKey,
  mobileKey: HomeSectionMobileKey
): boolean {
  return visibility[desktopKey] || visibility[mobileKey];
}

export function getHomeSectionVisibilityMode(
  visibility: HomeSectionsVisibility,
  desktopKey: HomeSectionDesktopKey,
  mobileKey: HomeSectionMobileKey
): 'hiddenDesktop' | 'hiddenMobile' | undefined {
  const desktopVisible = visibility[desktopKey];
  const mobileVisible = visibility[mobileKey];

  if (!desktopVisible && !mobileVisible) return undefined;
  if (!desktopVisible) return 'hiddenDesktop';
  if (!mobileVisible) return 'hiddenMobile';
  return undefined;
}
