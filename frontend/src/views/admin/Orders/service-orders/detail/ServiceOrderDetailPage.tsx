'use client';

import { ServiceOrderDetailPageView } from './ServiceOrderDetailPageView';
import { useServiceOrderDetailPage } from './hooks/useServiceOrderDetailPage';

type ServiceOrderDetailPageProps = {
  orderId: string;
};

export function ServiceOrderDetailPage({ orderId }: ServiceOrderDetailPageProps) {
  const model = useServiceOrderDetailPage(orderId);
  return <ServiceOrderDetailPageView model={model} />;
}
