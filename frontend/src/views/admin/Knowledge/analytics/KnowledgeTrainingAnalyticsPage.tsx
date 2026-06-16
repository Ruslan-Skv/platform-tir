'use client';

import { KnowledgeTrainingAnalyticsPageView } from './KnowledgeTrainingAnalyticsPageView';
import { useKnowledgeTrainingAnalyticsPage } from './hooks/useKnowledgeTrainingAnalyticsPage';

export function KnowledgeTrainingAnalyticsPage() {
  const model = useKnowledgeTrainingAnalyticsPage();
  return <KnowledgeTrainingAnalyticsPageView model={model} />;
}
