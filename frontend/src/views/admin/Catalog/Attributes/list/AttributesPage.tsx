'use client';

import { AttributesPageView } from './AttributesPageView';
import { useAttributesPage } from './hooks/useAttributesPage';

export function AttributesPage() {
  const model = useAttributesPage();
  return <AttributesPageView model={model} />;
}
