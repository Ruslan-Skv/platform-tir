'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ServiceOrderSummary,
  getServiceOrder,
  updateServiceOrderCustomer,
} from '@/shared/api/admin-orders';

export function useServiceOrderDetailPage(orderId: string) {
  const [order, setOrder] = useState<ServiceOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceOrder(orderId);
      setOrder(data);
      setCustomerEmail(data.customerEmail ?? '');
      setCustomerFirstName(data.customerFirstName ?? '');
      setCustomerLastName(data.customerLastName ?? '');
      setCustomerPhone(data.customerPhone ?? '');
    } catch {
      setError('Заказ не найден');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveCustomer = async () => {
    if (!orderId) return;
    setSaving(true);
    try {
      const updated = await updateServiceOrderCustomer(orderId, {
        customerEmail: customerEmail.trim() || null,
        customerFirstName: customerFirstName.trim() || null,
        customerLastName: customerLastName.trim() || null,
        customerPhone: customerPhone.trim() || null,
      });
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return {
    order,
    loading,
    error,
    customerEmail,
    setCustomerEmail,
    customerFirstName,
    setCustomerFirstName,
    customerLastName,
    setCustomerLastName,
    customerPhone,
    setCustomerPhone,
    saving,
    handleSaveCustomer,
  };
}

export type ServiceOrderDetailPageModel = ReturnType<typeof useServiceOrderDetailPage>;
