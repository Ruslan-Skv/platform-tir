'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAdminResourcePermission } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { useAuth } from '@/features/auth';
import {
  type KnowledgeMyTrainingProgress,
  type KnowledgeTrainingAnalytics,
  getKnowledgeMyTrainingProgress,
  getKnowledgeTrainingAnalytics,
} from '@/shared/api/admin-knowledge';

import {
  KNOWLEDGE_RESOURCE_ID,
  canViewKnowledgeTrainingAnalytics,
  isKnowledgeTraineeRole,
} from '../../shared/knowledge-utils';
import { resolveAnalyticsRange } from '../knowledge-training-analytics.utils';

export function useKnowledgeTrainingAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { canView: hasKnowledgeAccess } = useAdminResourcePermission(KNOWLEDGE_RESOURCE_ID);
  const canView = canViewKnowledgeTrainingAnalytics(user?.role, hasKnowledgeAccess);
  const isTrainee = isKnowledgeTraineeRole(user?.role);
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<KnowledgeTrainingAnalytics | null>(null);
  const [personalData, setPersonalData] = useState<KnowledgeMyTrainingProgress | null>(null);
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
      if (isTrainee) {
        const result = await getKnowledgeMyTrainingProgress(range);
        setPersonalData(result);
        setData(null);
      } else {
        const result = await getKnowledgeTrainingAnalytics(range);
        setData(result);
        setPersonalData(null);
      }
    } catch (err) {
      setData(null);
      setPersonalData(null);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, [isTrainee, range]);

  useEffect(() => {
    if (!canView) {
      router.replace('/admin/knowledge');
      return;
    }
    void load();
  }, [canView, load, router]);

  return {
    canView,
    isTrainee,
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    range,
    data,
    personalData,
    loading,
    error,
    reload: load,
  };
}

export type KnowledgeTrainingAnalyticsPageModel = ReturnType<
  typeof useKnowledgeTrainingAnalyticsPage
>;
