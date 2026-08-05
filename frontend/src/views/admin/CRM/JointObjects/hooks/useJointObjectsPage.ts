'use client';

import { useCallback, useEffect, useState } from 'react';

import { type JointObjectsListResult, getJointObjects } from '@/shared/api/crm/admin-joint-objects';

export type JointObjectsPageModel = ReturnType<typeof useJointObjectsPage>;

export function useJointObjectsPage() {
  const [data, setData] = useState<JointObjectsListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await getJointObjects({
        search: search.trim() || undefined,
        includeClosed,
      });
      setData(result);
      if (result.objects.length === 1) {
        setExpandedId(result.objects[0].id);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось загрузить');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [search, includeClosed]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void refresh();
      },
      search.trim() ? 300 : 0
    );
    return () => window.clearTimeout(timer);
  }, [refresh, search]);

  return {
    data,
    loading,
    message,
    setMessage,
    search,
    setSearch,
    includeClosed,
    setIncludeClosed,
    expandedId,
    setExpandedId,
    refresh,
  };
}
