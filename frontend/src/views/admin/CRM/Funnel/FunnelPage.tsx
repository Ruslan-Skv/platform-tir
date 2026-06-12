'use client';

import { FunnelPageView } from './FunnelPageView';
import { useFunnelPage } from './hooks/useFunnelPage';

export function FunnelPage() {
  const model = useFunnelPage();
  return <FunnelPageView model={model} />;
}
