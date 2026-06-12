'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AdminPromotion } from '@/shared/api/admin-promotions';
import { deletePromotion, getAdminPromotions } from '@/shared/api/admin-promotions';

export function usePromotionsPage() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPromotions({ limit: 100 });
      setPromotions(res.data);
    } catch {
      showMessage('error', 'Ошибка загрузки акций');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePromotion(deleteTarget.id);
      showMessage('success', 'Акция удалена');
      setDeleteTarget(null);
      loadPromotions();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  return {
    promotions,
    loading,
    message,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
  };
}

export type PromotionsPageModel = ReturnType<typeof usePromotionsPage>;
