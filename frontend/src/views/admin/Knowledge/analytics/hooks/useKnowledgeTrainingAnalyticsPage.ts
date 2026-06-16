'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type KnowledgeTrainingAnalytics,
  getKnowledgeTrainingAnalytics,
} from '@/shared/api/admin-knowledge';

import { resolveAnalyticsRange } from '../knowledge-training-analytics.utils';

export function useKnowledgeTrainingAnalyticsPage() {
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<KnowledgeTrainingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(
    () => resolveAnalyticsRange(period, dateFrom, dateTo),
    [period, dateFrom, dateTo]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getKnowledgeTrainingAnalytics(range);
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    range,
    data,
    loading,
    error,
    reload: load,
  };
}

export type KnowledgeTrainingAnalyticsPageModel = ReturnType<
  typeof useKnowledgeTrainingAnalyticsPage
>;
