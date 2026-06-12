'use client';

import { OrdersPageView } from './OrdersPageView';
import { useOrdersPage } from './hooks/useOrdersPage';

export function OrdersPage() {
  const model = useOrdersPage();
  return <OrdersPageView model={model} />;
}
