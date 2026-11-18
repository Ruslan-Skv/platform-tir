'use client';

import type { WindowsSectionData } from '@/shared/api/windows';

import { WindowsPageView } from './WindowsPageView';
import { useWindowsPage } from './hooks/useWindowsPage';

export function WindowsPage({ initialData }: { initialData: WindowsSectionData | null }) {
  const model = useWindowsPage(initialData);
  return <WindowsPageView model={model} />;
}
