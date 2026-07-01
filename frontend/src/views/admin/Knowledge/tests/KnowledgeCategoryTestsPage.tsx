'use client';

import { KnowledgeCategoryTestsPageView } from './KnowledgeCategoryTestsPageView';
import { useKnowledgeCategoryTestsPage } from './hooks/useKnowledgeCategoryTestsPage';

export function KnowledgeCategoryTestsPage() {
  const model = useKnowledgeCategoryTestsPage();
  return <KnowledgeCategoryTestsPageView model={model} />;
}
