'use client';

import { PromotionFormPageView } from './PromotionFormPageView';
import { usePromotionFormPage } from './hooks/usePromotionFormPage';

interface PromotionFormPageProps {
  promotionId?: string;
}

export function PromotionFormPage({ promotionId }: PromotionFormPageProps) {
  const model = usePromotionFormPage(promotionId);
  return <PromotionFormPageView model={model} />;
}
