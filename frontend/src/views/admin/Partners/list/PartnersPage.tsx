'use client';

import { PartnersPageView } from './PartnersPageView';
import { usePartnersPage } from './hooks/usePartnersPage';

export function PartnersPage() {
  const model = usePartnersPage();
  return <PartnersPageView model={model} />;
}
