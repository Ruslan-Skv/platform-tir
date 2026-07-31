'use client';

import { WaybillsPageView } from './WaybillsPageView';
import { useWaybillsPage } from './hooks/useWaybillsPage';

export function WaybillsPage() {
  const model = useWaybillsPage();
  return <WaybillsPageView model={model} />;
}
