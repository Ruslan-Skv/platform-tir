'use client';

import { AdvantagesSectionPageView } from './AdvantagesSectionPageView';
import { useAdvantagesSectionPage } from './hooks/useAdvantagesSectionPage';

export function AdvantagesSectionPage() {
  const model = useAdvantagesSectionPage();
  return <AdvantagesSectionPageView model={model} />;
}
