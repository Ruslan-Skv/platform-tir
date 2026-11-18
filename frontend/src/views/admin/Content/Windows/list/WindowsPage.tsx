'use client';

import { WindowsAdminPageView } from './WindowsPageView';
import { useWindowsPage } from './hooks/useWindowsPage';

export function WindowsSectionPage() {
  const model = useWindowsPage();
  return <WindowsAdminPageView model={model} />;
}
