'use client';

import { PromotionsPageView } from './PromotionsPageView';
import { usePromotionsPage } from './hooks/usePromotionsPage';

export function PromotionsPage() {
  const model = usePromotionsPage();
  return <PromotionsPageView model={model} />;
}
