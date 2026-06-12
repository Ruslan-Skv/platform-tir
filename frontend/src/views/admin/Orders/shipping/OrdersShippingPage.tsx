'use client';

import { OrdersShippingPageView } from './OrdersShippingPageView';
import { useOrdersShippingPage } from './hooks/useOrdersShippingPage';

export function OrdersShippingPage() {
  const model = useOrdersShippingPage();
  return <OrdersShippingPageView model={model} />;
}
