'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import {
  type SitePlatformFeedback,
  type SitePlatformFeedbackType,
  getSitePlatformFeedback,
  markSitePlatformFeedbackRead,
} from '@/shared/api/admin-site-feedback';

export function useSitePlatformFeedbackPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [items, setItems] = useState<SitePlatformFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<SitePlatformFeedbackType | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSitePlatformFeedback({
        type: typeFilter || undefined,
      });
      setItems(data.items);
      await markSitePlatformFeedbackRead();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сообщения');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/admin');
      return;
    }
    void load();
  }, [isSuperAdmin, load, router]);

  return {
    isSuperAdmin,
    items,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    load,
  };
}

export type SitePlatformFeedbackPageModel = ReturnType<typeof useSitePlatformFeedbackPage>;
