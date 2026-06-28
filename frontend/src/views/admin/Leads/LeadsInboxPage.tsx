'use client';

import { LeadsInboxPageView } from './LeadsInboxPageView';
import { useLeadsInboxPage } from './hooks/useLeadsInboxPage';

export function LeadsInboxPage() {
  const model = useLeadsInboxPage();
  return <LeadsInboxPageView model={model} />;
}
