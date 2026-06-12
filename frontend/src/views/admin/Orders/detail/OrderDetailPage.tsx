'use client';

import { OrderDetailPageView } from './OrderDetailPageView';
import { useOrderDetailPage } from './hooks/useOrderDetailPage';

type OrderDetailPageProps = {
  orderId: string;
};

export function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const model = useOrderDetailPage(orderId);
  return <OrderDetailPageView model={model} />;
}
