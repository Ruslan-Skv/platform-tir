'use client';

import { AdvertisingStrategyOverviewPageView } from './AdvertisingStrategyOverviewPageView';
import { useAdvertisingStrategyOverviewPage } from './hooks/useAdvertisingStrategyOverviewPage';

export function AdvertisingStrategyOverviewPage() {
  const model = useAdvertisingStrategyOverviewPage();
  return <AdvertisingStrategyOverviewPageView model={model} />;
}
