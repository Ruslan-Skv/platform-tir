'use client';

import { NavigationSectionPageView } from './NavigationSectionPageView';
import { useNavigationSectionPage } from './hooks/useNavigationSectionPage';

export type {
  CatalogCategoryFromApi,
  DropdownItemApi,
  DropdownSubItemApi,
  NavItem,
} from './navigation-section-page.types';

export function NavigationSectionPage() {
  const model = useNavigationSectionPage();
  return <NavigationSectionPageView model={model} />;
}
