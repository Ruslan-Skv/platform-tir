'use client';

import { FooterSectionPageView } from './FooterSectionPageView';
import { useFooterSectionPage } from './hooks/useFooterSectionPage';

export function FooterSectionPage() {
  const model = useFooterSectionPage();
  return <FooterSectionPageView model={model} />;
}
