'use client';

import { SitePlatformFeedbackPageView } from './SitePlatformFeedbackPageView';
import { useSitePlatformFeedbackPage } from './hooks/useSitePlatformFeedbackPage';

export function SitePlatformFeedbackPage() {
  const model = useSitePlatformFeedbackPage();
  return <SitePlatformFeedbackPageView model={model} />;
}
