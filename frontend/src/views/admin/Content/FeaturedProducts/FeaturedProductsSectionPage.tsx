'use client';

import { FeaturedProductsSectionPageView } from './FeaturedProductsSectionPageView';
import { useFeaturedProductsSectionPage } from './hooks/useFeaturedProductsSectionPage';

export function FeaturedProductsSectionPage() {
  const model = useFeaturedProductsSectionPage();
  return <FeaturedProductsSectionPageView model={model} />;
}
