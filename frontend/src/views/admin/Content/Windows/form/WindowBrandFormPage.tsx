'use client';

import { WindowBrandFormPageView } from './WindowBrandFormPageView';
import { useWindowBrandFormPage } from './hooks/useWindowBrandFormPage';

export function WindowBrandFormPage({ brandId }: { brandId?: string }) {
  const model = useWindowBrandFormPage(brandId);
  return <WindowBrandFormPageView model={model} />;
}
