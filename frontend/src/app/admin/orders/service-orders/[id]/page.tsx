'use client';

import { useParams } from 'next/navigation';

import { ServiceOrderDetailPage } from '@/views/admin/Orders';

export default function AdminServiceOrderDetailRoutePage() {
  const params = useParams();
  const orderId = typeof params?.id === 'string' ? params.id : '';
  if (!orderId) {
    return <p>Некорректный идентификатор заказа.</p>;
  }
  return <ServiceOrderDetailPage orderId={orderId} />;
}
