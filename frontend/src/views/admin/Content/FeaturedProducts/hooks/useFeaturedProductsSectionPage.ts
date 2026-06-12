'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import type {
  FeaturedProductsBlock,
  PrimaryFilter,
  SecondaryOrder,
} from '../featured-products-section-page.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useFeaturedProductsSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<FeaturedProductsBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_URL}/admin/home/featured-products`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          setData({
            ...d,
            primaryFilter: d.primaryFilter ?? 'featured',
            secondaryOrder: d.secondaryOrder ?? 'sort_order',
          });
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          showMessage('error', 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/featured-products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showMessage('success', 'Изменения успешно сохранены');
      } else {
        showMessage('error', 'Ошибка сохранения');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof FeaturedProductsBlock, value: string | number) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const handleLimitChange = (raw: string) => {
    const v = parseInt(raw, 10);
    handleChange('limit', Number.isNaN(v) ? 8 : Math.min(24, Math.max(1, v)));
  };

  return {
    data,
    loading,
    saving,
    message,
    handleSave,
    handleChange,
    handleLimitChange,
  };
}

export type FeaturedProductsSectionPageModel = ReturnType<typeof useFeaturedProductsSectionPage>;

export type { PrimaryFilter, SecondaryOrder };
