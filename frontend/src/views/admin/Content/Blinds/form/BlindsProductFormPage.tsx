'use client';

import { BlindsProductFormPageView } from './BlindsProductFormPageView';
import { useBlindsProductFormPage } from './hooks/useBlindsProductFormPage';

export function BlindsProductFormPage({ productId }: { productId?: string }) {
  const model = useBlindsProductFormPage(productId);
  return <BlindsProductFormPageView model={model} />;
}
