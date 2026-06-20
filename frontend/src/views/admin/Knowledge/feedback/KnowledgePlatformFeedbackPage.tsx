'use client';

import { KnowledgePlatformFeedbackPageView } from './KnowledgePlatformFeedbackPageView';
import { useKnowledgePlatformFeedbackPage } from './hooks/useKnowledgePlatformFeedbackPage';

export function KnowledgePlatformFeedbackPage() {
  const model = useKnowledgePlatformFeedbackPage();
  return <KnowledgePlatformFeedbackPageView model={model} />;
}
