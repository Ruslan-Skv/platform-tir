'use client';

import { ExecutorProfilesPageView } from './ExecutorProfilesPageView';
import { useExecutorProfilesPage } from './hooks/useExecutorProfilesPage';

export function ContractDocumentsExecutorProfilesPage() {
  const model = useExecutorProfilesPage();
  return <ExecutorProfilesPageView {...model} />;
}
