'use client';

import { Suspense } from 'react';

import { CatalogPageFallback, CatalogPageView } from './CatalogPageView';
import { type CatalogPageProps, useCatalogPage } from './hooks/useCatalogPage';

function CatalogPageContent(props: CatalogPageProps) {
  const model = useCatalogPage(props);
  return <CatalogPageView model={model} />;
}

export const CatalogPage = (props: CatalogPageProps) => (
  <Suspense fallback={<CatalogPageFallback />}>
    <CatalogPageContent {...props} />
  </Suspense>
);

export type { CatalogPageProps };
