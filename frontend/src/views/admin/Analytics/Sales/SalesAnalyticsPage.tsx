'use client';

import { SalesAnalyticsPageView } from './SalesAnalyticsPageView';
import { useSalesAnalyticsPage } from './hooks/useSalesAnalyticsPage';

export function SalesAnalyticsPage() {
  const model = useSalesAnalyticsPage();
  return <SalesAnalyticsPageView model={model} />;
}

export default SalesAnalyticsPage;
