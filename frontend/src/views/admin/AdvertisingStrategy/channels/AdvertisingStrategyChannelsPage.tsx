'use client';

import { AdvertisingStrategyChannelsPageView } from './AdvertisingStrategyChannelsPageView';
import { useAdvertisingStrategyChannelsPage } from './hooks/useAdvertisingStrategyChannelsPage';

export function AdvertisingStrategyChannelsPage() {
  const model = useAdvertisingStrategyChannelsPage();
  return <AdvertisingStrategyChannelsPageView model={model} />;
}
