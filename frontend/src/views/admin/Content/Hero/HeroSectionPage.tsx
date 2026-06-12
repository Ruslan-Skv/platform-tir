'use client';

import { HeroSectionPageView } from './HeroSectionPageView';
import { useHeroSectionPage } from './hooks/useHeroSectionPage';

export type { HeroSlideShowMode } from './hero-section-page.types';

export function HeroSectionPage() {
  const model = useHeroSectionPage();
  return <HeroSectionPageView model={model} />;
}
