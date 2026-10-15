'use client';

import { PayoutsPageView } from './PayoutsPageView';
import { usePayoutsPage } from './hooks/usePayoutsPage';

export function PayoutsPage() {
  const model = usePayoutsPage();
  return <PayoutsPageView model={model} />;
}
