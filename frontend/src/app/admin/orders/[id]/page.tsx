'use client';

import { useParams } from 'next/navigation';

import { OrderDetailPage } from '@/views/admin/Orders';

export default function AdminOrderDetailRoutePage() {
  const params = useParams();
  const orderId = typeof params?.id === 'string' ? params.id : '';
  if (!orderId) {
    return <p>Некорректный идентификатор заказа.</p>;
  }
  return <OrderDetailPage orderId={orderId} />;
}
