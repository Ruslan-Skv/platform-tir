'use client';

import { AdvertisingStrategyMetricsPageView } from './AdvertisingStrategyMetricsPageView';
import { useAdvertisingStrategyMetricsPage } from './hooks/useAdvertisingStrategyMetricsPage';

export function AdvertisingStrategyMetricsPage() {
  const model = useAdvertisingStrategyMetricsPage();
  return <AdvertisingStrategyMetricsPageView model={model} />;
}
