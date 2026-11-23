'use client';

import { BlindsCategoryFormPageView } from './BlindsCategoryFormPageView';
import { useBlindsCategoryFormPage } from './hooks/useBlindsCategoryFormPage';

export function BlindsCategoryFormPage({ categoryId }: { categoryId?: string }) {
  const model = useBlindsCategoryFormPage(categoryId);
  return <BlindsCategoryFormPageView model={model} />;
}
